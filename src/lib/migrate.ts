import { DB } from './db';

async function addColumnIfNotExists(table: string, column: string, definition: string): Promise<void> {
  const columns = await DB.query<{ name: string }>(`PRAGMA table_info(${table})`);
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    await DB.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export async function runMigrations(): Promise<void> {
  // 1. Add email and role columns to users (idempotent via PRAGMA check)
  // Note: SQLite doesn't support ADD COLUMN with UNIQUE constraint directly
  await addColumnIfNotExists('users', 'email', 'TEXT');
  await addColumnIfNotExists('users', 'role', "TEXT NOT NULL DEFAULT 'user'");

  // 2. Create programs table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS programs (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  // 3. Seed the Unbreakable program
  await DB.run(`INSERT OR IGNORE INTO programs (name) VALUES ('Unbreakable')`);

  // 4. Create user_programs join table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS user_programs (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, program_id)
    )
  `);

  // 5. Assign Unbreakable to all existing users that don't have any program yet
  await DB.run(`
    INSERT OR IGNORE INTO user_programs (user_id, program_id)
    SELECT u.id, p.id
    FROM users u
    CROSS JOIN programs p
    WHERE p.name = 'Unbreakable'
      AND NOT EXISTS (
        SELECT 1 FROM user_programs up WHERE up.user_id = u.id
      )
  `);
}
