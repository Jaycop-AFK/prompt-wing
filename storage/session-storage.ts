import * as SQLite from 'expo-sqlite';

import type { FormScore } from '@/core/coach';
import type { Split, TrackPoint } from '@/services/geo';

export interface SessionRecord {
  id: number;
  /** เวลาที่กดจบการวิ่ง หน่วย epoch ms */
  finishedAt: number;
  distanceKm: number;
  elapsedSeconds: number;
  /** null ถ้าระยะทางเป็นศูนย์ (คำนวณ pace ไม่ได้) */
  paceSecPerKm: number | null;
  calories: number;
  formScore: FormScore;
  splits: Split[];
  route: TrackPoint[];
}

export type NewSessionRecord = Omit<SessionRecord, 'id'>;

interface SessionRow {
  id: number;
  finished_at: number;
  distance_km: number;
  elapsed_seconds: number;
  pace_sec_per_km: number | null;
  calories: number;
  has_enough_form_data: number;
  cadence_dropped: number;
  pace_dropped: number;
  form_summary: string;
  splits_json: string;
  route_json: string;
}

const DATABASE_NAME = 'prompt-wing.db';

/**
 * แคชเป็น Promise ตัวเดียวไว้ (ไม่ใช่ค่าที่ resolve แล้ว) เพื่อให้เรียก getDb() พร้อมกันหลายจุดก่อน
 * เปิดฐานข้อมูลเสร็จก็ยังได้ instance เดียวกัน ไม่เปิดซ้ำซ้อนกัน สร้างตารางแบบ idempotent
 * (CREATE TABLE IF NOT EXISTS) ต่อท้ายไว้ในนี้เลย ผู้เรียกจึงไม่ต้องมีขั้นตอน init แยกต่างหาก
 */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise === null) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME)
      .then(async (db) => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            finished_at INTEGER NOT NULL,
            distance_km REAL NOT NULL,
            elapsed_seconds REAL NOT NULL,
            pace_sec_per_km REAL,
            calories INTEGER NOT NULL,
            has_enough_form_data INTEGER NOT NULL,
            cadence_dropped INTEGER NOT NULL,
            pace_dropped INTEGER NOT NULL,
            form_summary TEXT NOT NULL,
            splits_json TEXT NOT NULL,
            route_json TEXT NOT NULL
          );
        `);
        return db;
      })
      .catch((error) => {
        // ถ้าเปิดฐานข้อมูลหรือสร้างตารางล้มเหลว ต้องล้างแคชทิ้ง ไม่งั้น dbPromise จะค้างเป็น
        // Promise ที่ reject แล้วตลอดไป (ไม่ใช่ null) ทำให้ getDb() คืน Promise ตายตัวเดิมซ้ำ ๆ
        // ทุกครั้งไม่ว่าจะเรียกอีกกี่ครั้ง ผู้ใช้กดลองใหม่ตามที่ app/live-run.tsx แนะนำแล้วจะไม่มีทาง
        // สำเร็จเลยแม้ปัญหาที่แท้จริงจะเป็นแค่ความล้มเหลวชั่วคราวก็ตาม
        dbPromise = null;
        throw error;
      });
  }
  return dbPromise;
}

function rowToRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    finishedAt: row.finished_at,
    distanceKm: row.distance_km,
    elapsedSeconds: row.elapsed_seconds,
    paceSecPerKm: row.pace_sec_per_km,
    calories: row.calories,
    formScore: {
      hasEnoughData: row.has_enough_form_data === 1,
      cadenceDropped: row.cadence_dropped === 1,
      paceDropped: row.pace_dropped === 1,
      summary: row.form_summary,
    },
    splits: JSON.parse(row.splits_json),
    route: JSON.parse(row.route_json),
  };
}

/** บันทึก Session ที่เพิ่งจบ คืน id แถวที่เพิ่งสร้าง เรียกก่อนพาไปหน้าสรุปเสมอ ไม่มีอะไรในแอปนี้
 * ต้องรอเน็ตถึงจะบันทึกได้ (ดู ADR 0003) */
export async function saveSession(record: NewSessionRecord): Promise<number> {
  const db = await getDb();

  const result = await db.runAsync(
    `INSERT INTO sessions
      (finished_at, distance_km, elapsed_seconds, pace_sec_per_km, calories,
       has_enough_form_data, cadence_dropped, pace_dropped, form_summary, splits_json, route_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.finishedAt,
      record.distanceKm,
      record.elapsedSeconds,
      record.paceSecPerKm,
      record.calories,
      record.formScore.hasEnoughData ? 1 : 0,
      record.formScore.cadenceDropped ? 1 : 0,
      record.formScore.paceDropped ? 1 : 0,
      record.formScore.summary,
      JSON.stringify(record.splits),
      JSON.stringify(record.route),
    ]
  );

  return result.lastInsertRowId;
}

/** Session เดียวตาม id null ถ้าไม่พบ (เช่น id ผิดหรือถูกลบไปแล้ว) */
export async function getSession(id: number): Promise<SessionRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', id);
  return row ? rowToRecord(row) : null;
}

/** Session ทั้งหมด เรียงจากล่าสุดไปเก่าสุด */
export async function listSessions(): Promise<SessionRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionRow>('SELECT * FROM sessions ORDER BY finished_at DESC');
  return rows.map(rowToRecord);
}
