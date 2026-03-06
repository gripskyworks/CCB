/**
 * CCB 数据存储层
 * 使用 Bun 原生 SQLite
 */

import { Database } from 'bun:sqlite';
import type { Reminder, Memory, AIBehaviorLog } from './schema';

export class CCBStore {
  private db: Database;

  constructor(dbPath: string = './data/ccb.db') {
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        remindAt INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        recurrence TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        content TEXT NOT NULL,
        keywords TEXT,
        embedding TEXT,
        createdAt INTEGER NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS behavior_logs (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
  }

  // Reminder operations
  createReminder(reminder: Reminder): void {
    const stmt = this.db.prepare(`
      INSERT INTO reminders (id, userId, title, content, remindAt, status, recurrence, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      reminder.id,
      reminder.userId,
      reminder.title,
      reminder.content || null,
      reminder.remindAt,
      reminder.status,
      reminder.recurrence ? JSON.stringify(reminder.recurrence) : null,
      reminder.createdAt,
      reminder.updatedAt
    );
  }

  getReminders(userId: string, status?: string): Reminder[] {
    let query = `SELECT * FROM reminders WHERE userId = ?`;
    const params: any[] = [userId];
    
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY remindAt ASC`;
    
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => ({
      ...row,
      recurrence: row.recurrence ? JSON.parse(row.recurrence) : undefined
    }));
  }

  updateReminderStatus(id: string, status: Reminder['status']): void {
    this.db.prepare(`
      UPDATE reminders SET status = ?, updatedAt = ? WHERE id = ?
    `).run(status, Date.now(), id);
  }

  // Memory operations
  storeMemory(memory: Memory): void {
    const stmt = this.db.prepare(`
      INSERT INTO memories (id, userId, content, keywords, embedding, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      memory.id,
      memory.userId,
      memory.content,
      memory.keywords ? JSON.stringify(memory.keywords) : null,
      memory.embedding ? JSON.stringify(memory.embedding) : null,
      memory.createdAt
    );
  }

  searchMemories(userId: string, query: string): Memory[] {
    const rows = this.db.prepare(`
      SELECT * FROM memories 
      WHERE userId = ? AND content LIKE ?
      ORDER BY createdAt DESC
      LIMIT 10
    `).all(userId, `%${query}%`) as any[];
    
    return rows.map(row => ({
      ...row,
      keywords: row.keywords ? JSON.parse(row.keywords) : undefined,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined
    }));
  }

  getRecentMemories(userId: string, limit: number = 10): Memory[] {
    const rows = this.db.prepare(`
      SELECT * FROM memories WHERE userId = ?
      ORDER BY createdAt DESC
      LIMIT ?
    `).all(userId, limit) as any[];
    
    return rows.map(row => ({
      ...row,
      keywords: row.keywords ? JSON.parse(row.keywords) : undefined,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined
    }));
  }

  // Behavior log operations
  logBehavior(log: AIBehaviorLog): void {
    this.db.prepare(`
      INSERT INTO behavior_logs (id, userId, action, description, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(log.id, log.userId, log.action, log.description, log.timestamp);
  }

  getRecentBehaviors(userId: string, limit: number = 5): AIBehaviorLog[] {
    return this.db.prepare(`
      SELECT * FROM behavior_logs WHERE userId = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(userId, limit) as AIBehaviorLog[];
  }

  close(): void {
    this.db.close();
  }
}

// Global store instance
let store: CCBStore | null = null;

export function getStore(dbPath?: string): CCBStore {
  if (!store) {
    store = new CCBStore(dbPath);
  }
  return store;
}
