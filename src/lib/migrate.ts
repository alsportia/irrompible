import * as bcrypt from 'bcryptjs';
import { DB } from './db';

async function addColumnIfNotExists(table: string, column: string, definition: string): Promise<void> {
  const columns = await DB.query<{ name: string }>(`PRAGMA table_info(${table})`);
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    await DB.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function renameColumnIfExists(table: string, oldName: string, newName: string): Promise<void> {
  try {
    const columns = await DB.query<{ name: string }>(`PRAGMA table_info(${table})`);
    const exists = columns.some((col) => col.name === oldName);
    if (exists) {
      await DB.run(`ALTER TABLE "${table}" RENAME COLUMN "${oldName}" TO "${newName}"`);
    }
  } catch (e) {
    console.warn(`renameColumnIfExists(${table}, ${oldName} → ${newName}):`, e);
  }
}

export async function runMigrations(): Promise<void> {
  // 1. Users: email, role, status, password_hash
  await addColumnIfNotExists('users', 'email', 'TEXT');
  await addColumnIfNotExists('users', 'role', "TEXT NOT NULL DEFAULT 'user'");
  await addColumnIfNotExists('users', 'status', "TEXT NOT NULL DEFAULT 'active'");
  await addColumnIfNotExists('users', 'password_hash', 'TEXT');

  // 2. Programs table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS programs (
      programs_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT
    )
  `);

  // 3. Seed Unbreakable program
  await DB.run(`INSERT OR IGNORE INTO programs (name) VALUES ('Unbreakable')`);

  // 4. User-programs join table — FK references use original column names for compatibility
  // (renaming happens later in step 18; SQLite doesn't enforce FK names at CREATE time)
  await DB.run(`
    CREATE TABLE IF NOT EXISTS user_programs (
      users_id    INTEGER NOT NULL,
      programs_id INTEGER NOT NULL,
      PRIMARY KEY (users_id, programs_id)
    )
  `);

  // 5. Sessions table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      sessions_id  INTEGER PRIMARY KEY AUTOINCREMENT,
      session_code TEXT UNIQUE,
      name         TEXT,
      description  TEXT,
      programs_id  INTEGER REFERENCES programs(programs_id) ON DELETE SET NULL
    )
  `);

  // 6. Exercises table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS exercises (
      exercises_id          INTEGER PRIMARY KEY,
      name                  TEXT NOT NULL,
      video_url             TEXT,
      description           TEXT,
      muscles               TEXT,
      joints                TEXT,
      easier_exercises_id   INTEGER REFERENCES exercises(exercises_id),
      harder_exercises_id   INTEGER REFERENCES exercises(exercises_id)
    )
  `);

  // 7. (legacy: session_exercises removed — data migrated to sets/set_exercises)

  // 8. Energy levels lookup table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS energy_levels (
      energy_levels_id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      feeling_levels_id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      workout_logs_id  INTEGER PRIMARY KEY AUTOINCREMENT,
      sessions_id      INTEGER NOT NULL REFERENCES sessions(sessions_id),
      users_id         INTEGER NOT NULL REFERENCES users(users_id),
      energy_levels_id INTEGER REFERENCES energy_levels(energy_levels_id),
      feeling_levels_id INTEGER REFERENCES feeling_levels(feeling_levels_id),
      duration         INTEGER,
      completed_at     TEXT,
      created_at       TEXT DEFAULT (datetime('now'))
    )
  `);
  // Backward compat: older DBs used `date` instead of `created_at`.
  await addColumnIfNotExists('workout_logs', 'created_at', "TEXT DEFAULT (datetime('now'))");

  // 11. Workout sets
  await DB.run(`
    CREATE TABLE IF NOT EXISTS workout_sets (
      workout_sets_id  INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_logs_id  INTEGER NOT NULL REFERENCES workout_logs(workout_logs_id) ON DELETE CASCADE,
      exercises_id     INTEGER NOT NULL REFERENCES exercises(exercises_id),
      reps_done        INTEGER,
      weight           REAL,
      time_taken       INTEGER
    )
  `);

  // 12. New block model: sets table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS sets (
      set_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      sessions_id INTEGER NOT NULL REFERENCES sessions(sessions_id) ON DELETE CASCADE,
      description TEXT,
      block_label TEXT,
      block_type  TEXT,
      block_order INTEGER NOT NULL
    )
  `);
  await DB.run(`
    CREATE INDEX IF NOT EXISTS idx_sets_session_order ON sets (sessions_id, block_order)
  `);

  // 13. New block model: set_exercises table
  await DB.run(`
    CREATE TABLE IF NOT EXISTS set_exercises (
      set_exercise_id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id          INTEGER NOT NULL REFERENCES sets(set_id) ON DELETE CASCADE,
      set_number      INTEGER NOT NULL,
      exercises_id    INTEGER NOT NULL REFERENCES exercises(exercises_id),
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
  // (runs after rename migration below, so uses new column names)

  // ── 18. Rename PK columns (idempotent via renameColumnIfExists) ──────────

  // users
  await renameColumnIfExists('users', 'id', 'users_id');

  // programs
  await renameColumnIfExists('programs', 'id', 'programs_id');

  // sessions
  await renameColumnIfExists('sessions', 'id', 'sessions_id');
  await renameColumnIfExists('sessions', 'program_id', 'programs_id');

  // exercises
  await renameColumnIfExists('exercises', 'id', 'exercises_id');
  await renameColumnIfExists('exercises', 'easier_id', 'easier_exercises_id');
  await renameColumnIfExists('exercises', 'harder_id', 'harder_exercises_id');

  // energy_levels
  await renameColumnIfExists('energy_levels', 'id', 'energy_levels_id');

  // feeling_levels
  await renameColumnIfExists('feeling_levels', 'id', 'feeling_levels_id');

  // workout_logs
  await renameColumnIfExists('workout_logs', 'id', 'workout_logs_id');
  await renameColumnIfExists('workout_logs', 'session_id', 'sessions_id');
  await renameColumnIfExists('workout_logs', 'user_id', 'users_id');
  await renameColumnIfExists('workout_logs', 'energy_level_id', 'energy_levels_id');
  await renameColumnIfExists('workout_logs', 'feeling_level_id', 'feeling_levels_id');

  // workout_sets
  await renameColumnIfExists('workout_sets', 'id', 'workout_sets_id');
  await renameColumnIfExists('workout_sets', 'workout_log_id', 'workout_logs_id');
  await renameColumnIfExists('workout_sets', 'exercise_id', 'exercises_id');

  // user_programs
  await renameColumnIfExists('user_programs', 'user_id', 'users_id');
  await renameColumnIfExists('user_programs', 'program_id', 'programs_id');

  // sets
  await renameColumnIfExists('sets', 'session_id', 'sessions_id');

  // set_exercises
  await renameColumnIfExists('set_exercises', 'ex_id', 'exercises_id');

  // ── 19. Assign Unbreakable to existing users without any program ──────────
  await DB.run(`
    INSERT OR IGNORE INTO user_programs (users_id, programs_id)
    SELECT u.users_id, p.programs_id
    FROM users u
    CROSS JOIN programs p
    WHERE p.name = 'Unbreakable'
      AND NOT EXISTS (
        SELECT 1 FROM user_programs upr WHERE upr.users_id = u.users_id
      )
  `);

  // ── 20. Set default password (name) for users without password_hash ────────
  const usersWithoutPassword = await DB.query<{ users_id: number; name: string }>(
    `SELECT users_id, name FROM users WHERE password_hash IS NULL`
  );
  for (const u of usersWithoutPassword) {
    const hash = await bcrypt.hash(u.name, 10);
    await DB.run(`UPDATE users SET password_hash = ? WHERE users_id = ?`, [hash, u.users_id]);
  }
  if (usersWithoutPassword.length > 0) {
    console.log(`[migrate] Set default password (name) for ${usersWithoutPassword.length} user(s)`);
  }

  // ── 21. Ensure at least one admin user exists ─────────────────────────────
  const adminName = process.env.ADMIN_NAME ?? 'Admin';
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@unbreakable.app';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin1234';

  const existingAdmin = await DB.get(
    `SELECT users_id FROM users WHERE role = 'admin' LIMIT 1`
  );

  if (!existingAdmin) {
    console.log(`[migrate] No admin found — creating default admin (${adminEmail})`);
    const hash = await bcrypt.hash(adminPassword, 10);
    const result = await DB.run(
      `INSERT OR IGNORE INTO users (name, email, role, status, password_hash) VALUES (?, ?, 'admin', 'active', ?)`,
      [adminName, adminEmail, hash]
    );
    console.log(`[migrate] Admin created with users_id=${result.id}`);
  }
}
