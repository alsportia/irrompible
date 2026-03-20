import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'unbreakable.db');
const seedPath = path.join(process.cwd(), 'data', 'seed.db');

// On first deploy (volume is empty), copy seed DB so existing data is preserved
if (!fs.existsSync(dbPath) && fs.existsSync(seedPath)) {
  fs.copyFileSync(seedPath, dbPath);
  console.log('Initialized database from seed.db');
}

// Enable Promise wrapping for sqlite3 using standard util.promisify or a simple wrapper
// Instead of a full ORM, we'll write a simple async wrapper for sqlite3
export class DB {
  private static instance: sqlite3.Database;

  public static getInstance(): sqlite3.Database {
    if (!DB.instance) {
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
