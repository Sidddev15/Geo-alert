import Database from 'better-sqlite3';
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
const insertStmt = db.prepare(`
    INSERT INTO events (
      id, createdAtIso, lat, lng, eventType, battery, notes
    )
    VALUES (
      @id, @createdAtIso, @lat, @lng, @eventType, @battery, @notes
    )
`);
const lastEventStmt = db.prepare(`
    SELECT * FROM events ORDER BY createdAtIso DESC LIMIT 1
`);
const countTodayStmt = db.prepare(`
    SELECT COUNT(*) as c FROM events WHERE substr(createdAtIso,1,10) = ?
`);
export function insertEvent(e) {
    insertStmt.run(e);
}
export function getLastEvent() {
    const row = lastEventStmt.get();
    return row ?? null;
}
export function countToday(isoNow) {
    const day = isoNow.slice(0, 10);
    const row = countTodayStmt.get(day);
    return row?.c ?? 0;
}
