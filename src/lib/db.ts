import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'unbreakable.db');
const seedPath = path.join(process.cwd(), 'seed.db'); // outside the volume mount

export class DB {
  private static instance: sqlite3.Database;

  public static getInstance(): sqlite3.Database {
    if (!DB.instance) {
      // Lazy init: only runs at request time, not during build
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      if (fs.existsSync(seedPath)) {
        const dbEmpty = !fs.existsSync(dbPath) || fs.statSync(dbPath).size < 4096;
        if (dbEmpty) {
          fs.copyFileSync(seedPath, dbPath);
          console.log('Initialized database from seed.db');
        }
      }
      DB.instance = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database', err.message);
        } else {
          console.log('Connected to the SQLite database.');
        }
      });
    }
    return DB.instance;
  }

  public static close(): void {
    if (DB.instance) {
      DB.instance.close();
      DB.instance = undefined as any;
    }
  }

  public static async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const db = DB.getInstance();
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  public static async run(sql: string, params: any[] = []): Promise<{ id: number; changes: number }> {
    const db = DB.getInstance();
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  public static async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const db = DB.getInstance();
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }
}
