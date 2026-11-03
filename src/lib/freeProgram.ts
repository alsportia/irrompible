import { DB } from './db';

// Asigna el programa "Registro libre" a un usuario concreto. Se llama al crear o aprobar usuarios.
export async function assignFreeProgram(usersId: number): Promise<void> {
  await DB.run(
    `INSERT OR IGNORE INTO user_programs (users_id, programs_id)
     SELECT ?, programs_id FROM programs WHERE name = 'Registro libre'`,
    [usersId]
  );
}
