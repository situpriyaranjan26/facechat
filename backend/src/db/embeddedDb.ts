import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface TableRecord extends Record<string, any> {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export class EmbeddedDb {
  private dbPath: string;
  private tables: Record<string, TableRecord[]> = {};
  private inTransaction = false;
  private transactionSnapshot: string | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(dbPath?: string) {
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = dbPath || path.join(dataDir, 'facechat_db.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        this.tables = JSON.parse(raw);
        logger.info(`Loaded embedded database from ${this.dbPath}`);
      } else {
        this.tables = {};
        this.saveImmediately();
        logger.info(`Initialized fresh embedded database at ${this.dbPath}`);
      }
    } catch (err) {
      logger.error('Error loading embedded database, initializing empty', err);
      this.tables = {};
    }
  }

  private save(): void {
    if (this.inTransaction) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveImmediately();
    }, 100);
  }

  private saveImmediately(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.tables, null, 2), 'utf8');
    } catch (err) {
      logger.error('Failed to save embedded database to disk', err);
    }
  }

  public beginTransaction(): void {
    this.inTransaction = true;
    this.transactionSnapshot = JSON.stringify(this.tables);
  }

  public commitTransaction(): void {
    this.inTransaction = false;
    this.transactionSnapshot = null;
    this.saveImmediately();
  }

  public rollbackTransaction(): void {
    if (this.transactionSnapshot) {
      this.tables = JSON.parse(this.transactionSnapshot);
    }
    this.inTransaction = false;
    this.transactionSnapshot = null;
  }

  private getTable(name: string): TableRecord[] {
    const tableName = name.toLowerCase().trim();
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
    return this.tables[tableName];
  }

  public async executeSql<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');
    const lower = cleanSql.toLowerCase();

    // 1. DDL Statements (CREATE, EXTENSION, INDEX)
    if (lower.startsWith('create table')) {
      const match = cleanSql.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        this.getTable(match[1]);
      }
      return { rows: [], rowCount: 0 };
    }

    if (lower.startsWith('create extension') || lower.startsWith('create index')) {
      return { rows: [], rowCount: 0 };
    }

    if (lower === 'begin') {
      this.beginTransaction();
      return { rows: [], rowCount: 0 };
    }
    if (lower === 'commit') {
      this.commitTransaction();
      return { rows: [], rowCount: 0 };
    }
    if (lower === 'rollback') {
      this.rollbackTransaction();
      return { rows: [], rowCount: 0 };
    }
    if (lower === 'select 1') {
      return { rows: [{ '1': 1 }] as any, rowCount: 1 };
    }

    // 2. INSERT statements
    if (lower.startsWith('insert into')) {
      return this.handleInsert<T>(cleanSql, params);
    }

    // 3. UPDATE statements
    if (lower.startsWith('update')) {
      return this.handleUpdate<T>(cleanSql, params);
    }

    // 4. DELETE statements
    if (lower.startsWith('delete from')) {
      return this.handleDelete<T>(cleanSql, params);
    }

    // 5. SELECT statements
    if (lower.startsWith('select')) {
      return this.handleSelect<T>(cleanSql, params);
    }

    logger.warn('Unhandled SQL pattern in embedded DB:', cleanSql);
    return { rows: [], rowCount: 0 };
  }

  private handleInsert<T>(sql: string, params: any[]): { rows: T[]; rowCount: number } {
    const insertMatch = sql.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*values\s*\(/i);
    if (!insertMatch) {
      return { rows: [], rowCount: 0 };
    }

    const tableName = insertMatch[1].toLowerCase();
    const cols = insertMatch[2].split(',').map((c) => c.trim().toLowerCase());

    const valuesIdx = sql.toLowerCase().indexOf('values');
    const firstParen = sql.indexOf('(', valuesIdx);
    let lastParen = sql.lastIndexOf(')');
    let rest = '';

    if (/returning|on\s+conflict/i.test(sql)) {
      const matchTail = sql.match(/\)\s*(returning.*|on\s+conflict.*)$/i);
      if (matchTail) {
        rest = matchTail[1];
        lastParen = sql.lastIndexOf(')', sql.length - rest.length);
      }
    }

    const valContent = sql.substring(firstParen + 1, lastParen);

    // Parenthesis & quote-aware split
    const valPlaceholders: string[] = [];
    let curToken = '';
    let inParen = 0;
    let inQuote = false;

    for (let i = 0; i < valContent.length; i++) {
      const char = valContent[i];
      if (char === "'") inQuote = !inQuote;
      if (!inQuote) {
        if (char === '(') inParen++;
        else if (char === ')') inParen--;
        else if (char === ',' && inParen === 0) {
          valPlaceholders.push(curToken.trim());
          curToken = '';
          continue;
        }
      }
      curToken += char;
    }
    if (curToken.trim()) valPlaceholders.push(curToken.trim());

    const table = this.getTable(tableName);
    const newRecord: TableRecord = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    cols.forEach((col, idx) => {
      const placeholder = valPlaceholders[idx];
      let val: any = undefined;

      if (placeholder) {
        if (placeholder.startsWith('$')) {
          const paramIdx = parseInt(placeholder.substring(1), 10) - 1;
          val = params[paramIdx];
        } else if (placeholder.toLowerCase().includes('now() +')) {
          const intervalMatch = placeholder.match(/interval\s*['"](\d+)\s*hour/i);
          const hours = intervalMatch ? parseInt(intervalMatch[1], 10) : 12;
          val = new Date(Date.now() + hours * 3600 * 1000).toISOString();
        } else if (placeholder.toLowerCase() === 'now()') {
          val = new Date().toISOString();
        } else if (placeholder.startsWith("'") && placeholder.endsWith("'")) {
          val = placeholder.slice(1, -1);
        } else if (!isNaN(Number(placeholder))) {
          val = Number(placeholder);
        } else if (placeholder.toLowerCase() === 'null') {
          val = null;
        } else if (placeholder.toLowerCase() === 'true') {
          val = true;
        } else if (placeholder.toLowerCase() === 'false') {
          val = false;
        }
      }

      newRecord[col] = val !== undefined ? val : null;
    });

    if (newRecord.id === undefined || newRecord.id === null) {
      newRecord.id = uuidv4();
    }

    // Apply sane defaults
    if (tableName === 'guest_sessions') {
      if (newRecord.is_active === undefined || newRecord.is_active === null) newRecord.is_active = true;
      if (newRecord.total_minutes_used === undefined || newRecord.total_minutes_used === null) newRecord.total_minutes_used = 0;
    }
    if (tableName === 'users') {
      if (newRecord.is_banned === undefined || newRecord.is_banned === null) newRecord.is_banned = false;
      if (newRecord.is_admin === undefined || newRecord.is_admin === null) newRecord.is_admin = false;
    }
    if (tableName === 'reports') {
      if (!newRecord.status) newRecord.status = 'pending';
    }
    if (tableName === 'wallets') {
      if (newRecord.balance === undefined || newRecord.balance === null) newRecord.balance = 0;
      if (newRecord.total_earned === undefined || newRecord.total_earned === null) newRecord.total_earned = 0;
      if (newRecord.total_spent === undefined || newRecord.total_spent === null) newRecord.total_spent = 0;
    }
    if (tableName === 'conversations') {
      if (!newRecord.status) newRecord.status = 'connecting';
      if (newRecord.duration_seconds === undefined) newRecord.duration_seconds = 0;
    }

    // Handle ON CONFLICT
    if (/on\s+conflict/i.test(rest)) {
      const conflictColMatch = rest.match(/on\s+conflict\s*\(([a-zA-Z0-9_]+)\)/i);
      const conflictCol = conflictColMatch ? conflictColMatch[1].toLowerCase() : 'id';

      const existingIndex = table.findIndex((r) => r[conflictCol] === newRecord[conflictCol]);

      if (existingIndex !== -1) {
        if (/do\s+nothing/i.test(rest)) {
          return { rows: [table[existingIndex]] as any, rowCount: 0 };
        } else if (/do\s+update/i.test(rest)) {
          const existing = table[existingIndex];
          Object.assign(existing, newRecord, { updated_at: new Date().toISOString() });
          this.save();
          return { rows: [existing] as any, rowCount: 1 };
        }
      }
    }

    table.push(newRecord);
    this.save();

    return { rows: [newRecord] as any, rowCount: 1 };
  }

  private handleUpdate<T>(sql: string, params: any[]): { rows: T[]; rowCount: number } {
    const match = sql.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+(.*?)(?:\s+where\s+(.*?))?(?:\s+returning\s+.*)?$/i);
    if (!match) {
      return { rows: [], rowCount: 0 };
    }

    const tableName = match[1].toLowerCase();
    const setClause = match[2];
    const whereClause = match[3];

    const table = this.getTable(tableName);
    const updatedRows: TableRecord[] = [];

    const assignments = setClause.split(',').map((a) => a.trim());

    table.forEach((row) => {
      if (!whereClause || this.evaluateWhere(row, whereClause, params)) {
        assignments.forEach((assignment) => {
          const [colPart, valPartRaw] = assignment.split('=').map((s) => s.trim());
          const col = colPart.toLowerCase();
          const valPart = valPartRaw ? valPartRaw.trim() : '';

          if (valPart.startsWith('$')) {
            const paramIdx = parseInt(valPart.substring(1), 10) - 1;
            row[col] = params[paramIdx];
          } else if (valPart.toLowerCase().includes('now() +')) {
            let hours = 12;
            const paramMatch = valPart.match(/\$(\d+)/);
            if (paramMatch) {
              hours = Number(params[parseInt(paramMatch[1], 10) - 1]) || 12;
            } else {
              const intervalMatch = valPart.match(/interval\s*['"](\d+)\s*hour/i);
              if (intervalMatch) hours = parseInt(intervalMatch[1], 10);
            }
            row[col] = new Date(Date.now() + hours * 3600 * 1000).toISOString();
          } else if (valPart.toLowerCase() === 'now()') {
            row[col] = new Date().toISOString();
          } else if (valPart.toLowerCase() === 'null') {
            row[col] = null;
          } else if (valPart.toLowerCase() === 'true') {
            row[col] = true;
          } else if (valPart.toLowerCase() === 'false') {
            row[col] = false;
          } else if (valPart.startsWith("'") && valPart.endsWith("'")) {
            row[col] = valPart.slice(1, -1);
          } else if (valPart.includes('+')) {
            const plusParts = valPart.split('+').map((s) => s.trim());
            const addVal = plusParts[1]?.startsWith('$')
              ? params[parseInt(plusParts[1].substring(1), 10) - 1]
              : Number(plusParts[1]) || 1;
            row[col] = (Number(row[col]) || 0) + addVal;
          } else if (!isNaN(Number(valPart))) {
            row[col] = Number(valPart);
          }
        });

        row.updated_at = new Date().toISOString();
        updatedRows.push({ ...row });
      }
    });

    if (updatedRows.length > 0) {
      this.save();
    }

    return { rows: updatedRows as any, rowCount: updatedRows.length };
  }

  private handleDelete<T>(sql: string, params: any[]): { rows: T[]; rowCount: number } {
    const match = sql.match(/delete\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+(.*?))?$/i);
    if (!match) {
      return { rows: [], rowCount: 0 };
    }

    const tableName = match[1].toLowerCase();
    const whereClause = match[2];
    const table = this.getTable(tableName);

    const initialLen = table.length;
    const remaining = table.filter((row) => {
      if (!whereClause) return false;
      return !this.evaluateWhere(row, whereClause, params);
    });

    this.tables[tableName] = remaining;
    const deletedCount = initialLen - remaining.length;
    if (deletedCount > 0) {
      this.save();
    }

    return { rows: [], rowCount: deletedCount };
  }

  private handleSelect<T>(sql: string, params: any[]): { rows: T[]; rowCount: number } {
    // 1. Aggregates: SELECT COUNT(*) as total FROM table
    if (/select\s+count\(\*\)/i.test(sql)) {
      const match = sql.match(/select\s+count\(\*\)(?:\s+as\s+([a-zA-Z0-9_]+))?\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+(.*?))?$/i);
      if (match) {
        const alias = match[1] || 'count';
        const tableName = match[2].toLowerCase();
        const whereClause = match[3];
        const table = this.getTable(tableName);

        let filtered = table;
        if (whereClause) {
          filtered = table.filter((row) => this.evaluateWhere(row, whereClause, params));
        }

        return { rows: [{ [alias]: String(filtered.length) }] as any, rowCount: 1 };
      }
    }

    // 2. Overview aggregate stats
    if (/select\s+sum\(amount_usd\)/i.test(sql)) {
      const table = this.getTable('coin_purchases');
      const total = table
        .filter((r) => r.status === 'completed')
        .reduce((sum, r) => sum + (Number(r.amount_usd) || 0), 0);
      return { rows: [{ total: String(total) }] as any, rowCount: 1 };
    }

    // 3. Regular SELECT
    const match = sql.match(/select\s+(.*?)\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+(.*?))?(?:\s+order\s+by\s+(.*?))?(?:\s+limit\s+([$0-9]+))?(?:\s+offset\s+([$0-9]+))?$/i);
    if (!match) {
      return { rows: [], rowCount: 0 };
    }

    const selectFields = match[1].split(',').map((f) => f.trim());
    const tableName = match[2].toLowerCase();
    const whereClause = match[3];
    const orderByClause = match[4];
    const limitClause = match[5];
    const offsetClause = match[6];

    let rows = [...this.getTable(tableName)];

    // WHERE
    if (whereClause) {
      rows = rows.filter((row) => this.evaluateWhere(row, whereClause, params));
    }

    // ORDER BY
    if (orderByClause) {
      const orderParts = orderByClause.trim().split(/\s+/);
      const orderCol = orderParts[0].toLowerCase();
      const isDesc = orderParts[1]?.toLowerCase() === 'desc';

      rows.sort((a, b) => {
        const valA = a[orderCol];
        const valB = b[orderCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (valA < valB) return isDesc ? 1 : -1;
        return isDesc ? -1 : 1;
      });
    }

    // OFFSET
    if (offsetClause) {
      const offsetVal = offsetClause.startsWith('$')
        ? params[parseInt(offsetClause.substring(1), 10) - 1]
        : parseInt(offsetClause, 10);
      rows = rows.slice(offsetVal || 0);
    }

    // LIMIT
    if (limitClause) {
      const limitVal = limitClause.startsWith('$')
        ? params[parseInt(limitClause.substring(1), 10) - 1]
        : parseInt(limitClause, 10);
      rows = rows.slice(0, limitVal || rows.length);
    }

    // Projection
    if (selectFields.length === 1 && (selectFields[0] === '*' || selectFields[0] === '1')) {
      return { rows: rows as any, rowCount: rows.length };
    }

    const projected = rows.map((row) => {
      const obj: any = {};
      selectFields.forEach((field) => {
        const f = field.toLowerCase();
        if (row[f] !== undefined) {
          obj[f] = row[f];
        }
      });
      return obj;
    });

    return { rows: projected as any, rowCount: projected.length };
  }

  private evaluateWhere(row: TableRecord, whereClause: string, params: any[]): boolean {
    const cleanWhere = whereClause.trim();
    if (!cleanWhere) return true;

    const conditions = cleanWhere.split(/\s+and\s+/i);

    return conditions.every((cond) => {
      const c = cond.trim();

      let m = c.match(/([a-zA-Z0-9_.]+)\s*(=|!=|<>|>|<|>=|<=)\s*(.*)/i);
      if (m) {
        const col = m[1].replace(/^[a-zA-Z0-9_]+\./, '').toLowerCase();
        const op = m[2];
        const rawTarget = m[3].trim();

        let targetVal: any;
        if (rawTarget.startsWith('$')) {
          const idx = parseInt(rawTarget.substring(1), 10) - 1;
          targetVal = params[idx];
        } else if (rawTarget.toLowerCase() === 'now()') {
          targetVal = new Date().toISOString();
        } else if (rawTarget.toLowerCase() === 'true') {
          targetVal = true;
        } else if (rawTarget.toLowerCase() === 'false') {
          targetVal = false;
        } else if (rawTarget.toLowerCase() === 'null') {
          targetVal = null;
        } else if (rawTarget.startsWith("'") && rawTarget.endsWith("'")) {
          targetVal = rawTarget.slice(1, -1);
        } else if (!isNaN(Number(rawTarget))) {
          targetVal = Number(rawTarget);
        }

        const rowVal = row[col];

        // Date comparison support
        const isRowDate = rowVal instanceof Date || (typeof rowVal === 'string' && !isNaN(Date.parse(rowVal)) && (col.includes('time') || col.includes('expires') || col.includes('at')));
        const isTargetDate = targetVal instanceof Date || (typeof targetVal === 'string' && !isNaN(Date.parse(targetVal)) && (rawTarget.toLowerCase() === 'now()' || col.includes('time') || col.includes('expires') || col.includes('at')));

        if (isRowDate && isTargetDate) {
          const rMs = rowVal instanceof Date ? rowVal.getTime() : Date.parse(rowVal);
          const tMs = targetVal instanceof Date ? targetVal.getTime() : Date.parse(targetVal);

          if (op === '=') return rMs === tMs;
          if (op === '!=' || op === '<>') return rMs !== tMs;
          if (op === '>') return rMs > tMs;
          if (op === '<') return rMs < tMs;
          if (op === '>=') return rMs >= tMs;
          if (op === '<=') return rMs <= tMs;
        }

        if (op === '=') return rowVal === targetVal;
        if (op === '!=' || op === '<>') return rowVal !== targetVal;
        if (op === '>') return rowVal > targetVal;
        if (op === '<') return rowVal < targetVal;
        if (op === '>=') return rowVal >= targetVal;
        if (op === '<=') return rowVal <= targetVal;
      }

      // IS NULL / IS NOT NULL
      if (/is\s+null/i.test(c)) {
        const colMatch = c.match(/([a-zA-Z0-9_]+)\s+is\s+null/i);
        if (colMatch) {
          return row[colMatch[1].toLowerCase()] === null || row[colMatch[1].toLowerCase()] === undefined;
        }
      }
      if (/is\s+not\s+null/i.test(c)) {
        const colMatch = c.match(/([a-zA-Z0-9_]+)\s+is\s+not\s+null/i);
        if (colMatch) {
          return row[colMatch[1].toLowerCase()] !== null && row[colMatch[1].toLowerCase()] !== undefined;
        }
      }

      return true;
    });
  }
}

export const embeddedDb = new EmbeddedDb();
