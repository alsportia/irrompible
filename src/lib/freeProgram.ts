import { DB } from './db';

// Identificador fijo del programa de registro libre (no depende del nombre visible)
export const FREE_PROGRAM_SLUG = 'free-log';

// Asigna el programa de registro libre a un usuario concreto. Se llama al crear o aprobar usuarios.
export async function assignFreeProgram(usersId: number): Promise<void> {
  await DB.run(
    `INSERT OR IGNORE INTO user_programs (users_id, programs_id)
     SELECT ?, programs_id FROM programs WHERE slug = ?`,
    [usersId, FREE_PROGRAM_SLUG]
  );
}
