export function getDb() {
  throw new Error("Database is not configured yet. Connect Neon Postgres before using persistent data.");
}
