import Database from 'better-sqlite3';

export type StoredEvent = {
    id: string;
    createdAtIso: string;
    lat: number;
    lng: number;
    eventType: string;
    battery: number | null;
    notes: string | null;
};

const db = new Database('geo-alert.sqlite');

db.exec(`
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  createdAtIso TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  eventType TEXT NOT NULL,
  battery REAL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_createdAt
ON events(createdAtIso);
`);

const insertStmt = db.prepare<StoredEvent>(`
    INSERT INTO events (
      id, createdAtIso, lat, lng, eventType, battery, notes
    )
    VALUES (
      @id, @createdAtIso, @lat, @lng, @eventType, @battery, @notes
    )
`);

const lastEventStmt = db.prepare<[], StoredEvent>(`
    SELECT * FROM events ORDER BY createdAtIso DESC LIMIT 1
`);

const countTodayStmt = db.prepare<[string], { c: number }>(`
    SELECT COUNT(*) as c FROM events WHERE substr(createdAtIso,1,10) = ?
`);

export function insertEvent(e: StoredEvent) {
    insertStmt.run(e);
}

export function getLastEvent(): StoredEvent | null {
    const row = lastEventStmt.get();
    return row ?? null;
}

export function countToday(isoNow: string): number {
    const day = isoNow.slice(0, 10);
    const row = countTodayStmt.get(day);
    return row?.c ?? 0;
}
