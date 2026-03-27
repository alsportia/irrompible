import { DB } from './db';

async function addColumnIfNotExists(table: string, column: string, definition: string): Promise<void> {
  const columns = await DB.query<{ name: string }>(`PRAGMA table_info(${table})`);
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    await DB.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export async function runMigrations(): Promise<void> {
  // 1. Users: email, role, status
  await addColumnIfNotExists('users', 'email', 'TEXT');
  await addColumnIfNotExists('users', 'role', "TEXT NOT NULL DEFAULT 'user'");
  await addColumnIfNotExists('users', 'status', "TEXT NOT NULL DEFAULT 'active'");

  // 2. Programs table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS programs (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT
    )
  `);

  // 3. Seed Unbreakable program
  await DB.run(`INSERT OR IGNORE INTO programs (name) VALUES ('Unbreakable')`);

  // 4. User-programs join table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS user_programs (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, program_id)
    )
  `);

  // 5. Sessions table (new schema: integer PK + session_code + program_id)
  await DB.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      session_code TEXT UNIQUE,
      name         TEXT,
      description  TEXT,
      program_id   INTEGER REFERENCES programs(id) ON DELETE SET NULL
    )
  `);

  // 6. Exercises table (integer PK)
  await DB.run(`
    CREATE TABLE IF NOT EXISTS exercises (
      id          INTEGER PRIMARY KEY,
      name        TEXT NOT NULL,
      video_url   TEXT,
      description TEXT,
      muscles     TEXT,
      joints      TEXT,
      easier_id   INTEGER REFERENCES exercises(id),
      harder_id   INTEGER REFERENCES exercises(id)
    )
  `);

  // 7. Session-exercises join table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS session_exercises (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      ex_id      INTEGER NOT NULL REFERENCES exercises(id),
      block      TEXT,
      block_type TEXT,
      set_number INTEGER,
      ex_order   INTEGER,
      reps       TEXT,
      tiempo_ej  TEXT
    )
  `);

  // 8. Energy levels lookup table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS energy_levels (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE,
      pct   REAL NOT NULL
    )
  `);
  await DB.run(`INSERT OR IGNORE INTO energy_levels (label, pct) VALUES ('¡A tope!', 1.0)`);
  await DB.run(`INSERT OR IGNORE INTO energy_levels (label, pct) VALUES ('Bien', 0.75)`);
  await DB.run(`INSERT OR IGNORE INTO energy_levels (label, pct) VALUES ('Cansado', 0.50)`);
  await DB.run(`INSERT OR IGNORE INTO energy_levels (label, pct) VALUES ('Muy Cansado', 0.25)`);

  // 9. Feeling levels lookup table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS feeling_levels (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE,
      score INTEGER NOT NULL
    )
  `);
  await DB.run(`INSERT OR IGNORE INTO feeling_levels (label, score) VALUES ('Excelente', 100)`);
  await DB.run(`INSERT OR IGNORE INTO feeling_levels (label, score) VALUES ('Bien', 80)`);
  await DB.run(`INSERT OR IGNORE INTO feeling_levels (label, score) VALUES ('Normal', 60)`);
  await DB.run(`INSERT OR IGNORE INTO feeling_levels (label, score) VALUES ('Duro', 40)`);
  await DB.run(`INSERT OR IGNORE INTO feeling_levels (label, score) VALUES ('Muy Duro', 20)`);

  // 10. Workout logs
  await DB.run(`
    CREATE TABLE IF NOT EXISTS workout_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id      INTEGER NOT NULL REFERENCES sessions(id),
      user_id         INTEGER NOT NULL REFERENCES users(id),
      energy_level_id INTEGER REFERENCES energy_levels(id),
      feeling_level_id INTEGER REFERENCES feeling_levels(id),
      duration        INTEGER,
      completed_at    TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    )
  `);

  // 11. Workout sets
  await DB.run(`
    CREATE TABLE IF NOT EXISTS workout_sets (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_log_id INTEGER NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
      exercise_id    INTEGER NOT NULL REFERENCES exercises(id),
      reps_done      INTEGER,
      weight         REAL,
      time_taken     INTEGER
    )
  `);

  // 12. New block model: sets table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS sets (
      set_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      description TEXT,
      block_label TEXT,
      block_type  TEXT,
      block_order INTEGER NOT NULL
    )
  `);
  await DB.run(`
    CREATE INDEX IF NOT EXISTS idx_sets_session_order ON sets (session_id, block_order)
  `);

  // 13. New block model: set_exercises table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS set_exercises (
      set_exercise_id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id          INTEGER NOT NULL REFERENCES sets(set_id) ON DELETE CASCADE,
      set_number      INTEGER NOT NULL,
      ex_id           INTEGER NOT NULL REFERENCES exercises(id),
      ex_order        INTEGER NOT NULL,
      reps            TEXT,
      tiempo_ej       TEXT
    )
  `);

  // 14. Add video_url_yt to exercises if missing (legacy DBs)
  await addColumnIfNotExists('exercises', 'video_url_yt', 'TEXT');

  // 16. Add peso to set_exercises
  await addColumnIfNotExists('set_exercises', 'peso', 'REAL NOT NULL DEFAULT 0');

  // 17. Add set_number to workout_sets
  await addColumnIfNotExists('workout_sets', 'set_number', 'INTEGER');

  // 15. Assign Unbreakable to existing users without any program
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
