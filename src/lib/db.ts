import path from 'path';
import fs from 'fs';

// ── Turso (production) vs SQLite local (development) ──────────────────────
// In production set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars.
// In development the app falls back to a local SQLite file via better-sqlite3.

type Row = Record<string, unknown>;

interface DbClient {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<{ id: number; changes: number }>;
  close(): void;
}

// ── Local SQLite client (development / fallback) ───────────────────────────
function createLocalClient(): DbClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sqlite3 = require('sqlite3') as typeof import('sqlite3');

  const dbPath = process.env.DATA_DIR
    ? path.join(process.env.DATA_DIR, 'unbreakable.db')
    : path.join(process.cwd(), 'data', 'unbreakable.db');
  const seedPath = path.join(process.cwd(), 'seed.db');

  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (fs.existsSync(seedPath)) {
    const dbEmpty = !fs.existsSync(dbPath) || fs.statSync(dbPath).size < 4096;
    if (dbEmpty) {
      fs.copyFileSync(seedPath, dbPath);
      console.log('Initialized database from seed.db');
    }
  }

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error opening database', err.message);
    else console.log('Connected to local SQLite database.');
  });

  return {
    query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows as T[]));
      });
    },
    get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row as T));
      });
    },
    run(sql: string, params: unknown[] = []): Promise<{ id: number; changes: number }> {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          err ? reject(err) : resolve({ id: this.lastID, changes: this.changes });
        });
      });
    },
    close() { db.close(); },
  };
}

// ── Turso client (production) ──────────────────────────────────────────────
function createTursoClient(): DbClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@libsql/client') as typeof import('@libsql/client');
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return {
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const result = await client.execute({ sql, args: params as import('@libsql/client').InArgs });
      return result.rows as unknown as T[];
    },
    async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      const result = await client.execute({ sql, args: params as import('@libsql/client').InArgs });
      return (result.rows[0] ?? undefined) as unknown as T | undefined;
    },
    async run(sql: string, params: unknown[] = []): Promise<{ id: number; changes: number }> {
      const result = await client.execute({ sql, args: params as import('@libsql/client').InArgs });
      return {
        id: Number(result.lastInsertRowid ?? 0),
        changes: result.rowsAffected,
      };
    },
    close() { /* no-op for Turso */ },
  };
}

// ── Singleton ──────────────────────────────────────────────────────────────
let _client: DbClient | null = null;

function getClient(): DbClient {
  if (!_client) {
    _client = process.env.TURSO_DATABASE_URL
      ? createTursoClient()
      : createLocalClient();
  }
  return _client;
}

// ── Public API (same interface as before) ─────────────────────────────────
export class DB {
  static query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
    return getClient().query<T>(sql, params);
  }
  static get<T = Row>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return getClient().get<T>(sql, params);
  }
  static run(sql: string, params: unknown[] = []): Promise<{ id: number; changes: number }> {
    return getClient().run(sql, params);
  }
  static close(): void {
    getClient().close();
    _client = null;
  }
  /** @deprecated use DB.query/get/run directly */
  static getInstance() { return getClient(); }
}
