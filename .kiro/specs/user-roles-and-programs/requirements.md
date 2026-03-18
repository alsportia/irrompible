# Documento de Requisitos

## Introducción

Esta funcionalidad amplía el sistema de usuarios de la aplicación de entrenamiento Unbreakable para soportar autenticación por email, roles de usuario (Administrador / Usuario) y control de acceso a programas de entrenamiento. Incluye una pantalla de selección de programa post-login y un panel de administración para gestionar usuarios y sus permisos.

## Glosario

- **Sistema**: La aplicación web Next.js de entrenamiento Unbreakable.
- **Usuario**: Persona registrada en el sistema con email, nombre y rol asignado.
- **Administrador**: Usuario con rol `admin` que tiene acceso al panel de administración.
- **Usuario_Estándar**: Usuario con rol `user` (rol por defecto) que solo accede a sus programas asignados.
- **Programa**: Conjunto de sesiones de entrenamiento (ej. "Unbreakable", "Muscle Hunters").
- **Selector_de_Programas**: Pantalla post-login que muestra los programas accesibles para el usuario autenticado.
- **Panel_Admin**: Interfaz exclusiva para Administradores para gestionar usuarios y sus accesos.
- **Acceso_a_Programa**: Relación entre un Usuario y un Programa que le permite visualizarlo.
- **UserContext**: Contexto React que almacena el estado del usuario autenticado en localStorage.
- **LoginSelector**: Componente de pantalla de login que permite al usuario identificarse por email.

---

## Requisitos

### Requisito 1: Autenticación por email

**User Story:** Como usuario, quiero identificarme con mi email en lugar de seleccionar mi nombre de una lista, para que mi acceso sea único e inequívoco.

#### Criterios de Aceptación

1. THE Sistema SHALL almacenar un campo `email` único por usuario en la base de datos.
2. THE LoginSelector SHALL mostrar un campo de entrada de texto para que el usuario introduzca su email.
3. WHEN el usuario introduce un email y confirma el login, THE Sistema SHALL buscar el usuario por email en la base de datos.
4. IF el email introducido no corresponde a ningún usuario registrado, THEN THE LoginSelector SHALL mostrar el mensaje "Email no encontrado".
5. IF el email introducido está vacío, THEN THE LoginSelector SHALL mostrar el mensaje "Introduce tu email".
6. WHEN el login es exitoso, THE UserContext SHALL almacenar `{ id, name, email, role }` del usuario autenticado en localStorage.

---

### Requisito 2: Gestión de roles de usuario

**User Story:** Como administrador, quiero que cada usuario tenga un rol asignado (Administrador o Usuario), para controlar qué funcionalidades puede acceder cada persona.

#### Criterios de Aceptación

1. THE Sistema SHALL soportar exactamente dos roles: `admin` y `user`.
2. THE Sistema SHALL asignar el rol `user` por defecto a todo nuevo usuario creado.
3. WHEN se crea un usuario sin especificar rol, THE Sistema SHALL asignar el rol `user` automáticamente.
4. THE Sistema SHALL persistir el rol de cada usuario en la base de datos.
5. WHEN el UserContext carga un usuario desde localStorage, THE Sistema SHALL incluir el campo `role` en el objeto de usuario.

---

### Requisito 3: Acceso de usuarios a programas

**User Story:** Como administrador, quiero asignar a cada usuario los programas de entrenamiento a los que tiene acceso, para que cada persona solo vea su contenido relevante.

#### Criterios de Aceptación

1. THE Sistema SHALL mantener una tabla de relación entre usuarios y programas que define los accesos permitidos.
2. THE Sistema SHALL almacenar los programas disponibles en una tabla `programs` con al menos `id` y `name`.
3. WHEN se consultan los programas de un usuario, THE Sistema SHALL devolver únicamente los programas a los que ese usuario tiene acceso asignado.
4. IF un usuario no tiene ningún programa asignado, THEN THE Selector_de_Programas SHALL mostrar el mensaje "No tienes programas asignados. Contacta con el administrador.".
5. THE Sistema SHALL permitir que un usuario tenga acceso a uno o más programas simultáneamente.

---

### Requisito 4: Pantalla de selección de programa (post-login)

**User Story:** Como usuario, quiero ver una pantalla con los programas a los que tengo acceso después de hacer login, para poder elegir qué programa entrenar.

#### Criterios de Aceptación

1. WHEN el login es exitoso, THE Sistema SHALL redirigir al usuario a la pantalla Selector_de_Programas.
2. THE Selector_de_Programas SHALL mostrar un botón por cada programa al que el usuario tiene acceso.
3. WHEN el usuario pulsa el botón de un programa, THE Sistema SHALL navegar a la pantalla principal de ese programa.
4. WHERE el usuario autenticado tiene rol `admin`, THE Selector_de_Programas SHALL mostrar un botón adicional de acceso al Panel_Admin en la parte superior de la pantalla.
5. THE Selector_de_Programas SHALL mostrar el nombre del usuario autenticado.
6. THE Selector_de_Programas SHALL incluir un botón para cerrar sesión que limpie el UserContext y redirija al LoginSelector.

---

### Requisito 5: Panel de administración — Gestión de roles

**User Story:** Como administrador, quiero poder cambiar el rol de cualquier usuario desde el panel de administración, para gestionar quién tiene privilegios de administrador.

#### Criterios de Aceptación

1. WHEN un usuario con rol `admin` accede al Panel_Admin, THE Sistema SHALL mostrar la lista completa de usuarios con su nombre, email y rol actual.
2. THE Panel_Admin SHALL permitir cambiar el rol de cualquier usuario entre `admin` y `user`.
3. WHEN se guarda el cambio de rol de un usuario, THE Sistema SHALL persistir el nuevo rol en la base de datos.
4. IF un usuario sin rol `admin` intenta acceder a la ruta del Panel_Admin, THEN THE Sistema SHALL redirigir al Selector_de_Programas.
5. WHEN el cambio de rol se completa correctamente, THE Panel_Admin SHALL reflejar el nuevo rol del usuario en la lista sin recargar la página completa.

---

### Requisito 6: Panel de administración — Gestión de acceso a programas

**User Story:** Como administrador, quiero poder asignar y revocar el acceso de cada usuario a los programas disponibles, para controlar qué contenido puede ver cada persona.

#### Criterios de Aceptación

1. THE Panel_Admin SHALL mostrar, para cada usuario, los programas a los que tiene acceso actualmente.
2. THE Panel_Admin SHALL permitir asignar uno o más programas a un usuario.
3. THE Panel_Admin SHALL permitir revocar el acceso de un usuario a un programa.
4. WHEN se guarda el cambio de acceso a programas de un usuario, THE Sistema SHALL actualizar la tabla de relación usuario-programa en la base de datos.
5. WHEN el cambio de acceso se completa correctamente, THE Panel_Admin SHALL reflejar el estado actualizado sin recargar la página completa.
6. IF se intenta revocar el acceso al último programa de un usuario, THEN THE Panel_Admin SHALL mostrar un mensaje de confirmación antes de proceder.

---

### Requisito 7: Migración de datos existentes

**User Story:** Como administrador, quiero que los usuarios existentes en la base de datos sean migrados correctamente al nuevo esquema, para no perder datos ni interrumpir el acceso de los usuarios actuales.

#### Criterios de Aceptación

1. WHEN se ejecuta la migración de base de datos, THE Sistema SHALL añadir las columnas `email` y `role` a la tabla `users` existente sin eliminar los registros actuales.
2. WHEN se ejecuta la migración, THE Sistema SHALL asignar el rol `user` a todos los usuarios existentes que no tengan rol asignado.
3. WHEN se ejecuta la migración, THE Sistema SHALL crear la tabla `programs` con el programa "Unbreakable" como registro inicial.
4. WHEN se ejecuta la migración, THE Sistema SHALL asignar acceso al programa "Unbreakable" a todos los usuarios existentes.
5. THE Sistema SHALL ejecutar la migración de forma idempotente, de modo que ejecutarla múltiples veces produzca el mismo resultado que ejecutarla una sola vez.

---

### Requisito 8: Seguridad de acceso a rutas y API

**User Story:** Como administrador, quiero que las rutas y endpoints del panel de administración estén protegidos, para que solo los administradores puedan acceder a ellos.

#### Criterios de Aceptación

1. WHEN una petición a un endpoint de administración llega sin un usuario autenticado válido, THE Sistema SHALL responder con código HTTP 401.
2. WHEN una petición a un endpoint de administración llega con un usuario autenticado con rol `user`, THE Sistema SHALL responder con código HTTP 403.
3. THE Sistema SHALL validar el rol del usuario en el servidor en cada petición a endpoints de administración, sin depender únicamente del estado del cliente.
4. IF la sesión del usuario en localStorage no contiene un `id` válido en la base de datos, THEN THE Sistema SHALL limpiar el UserContext y redirigir al LoginSelector.
