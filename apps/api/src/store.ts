import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  emptyData,
  parseBackup,
  type AppData,
  type StateSnapshot,
} from "@compasso/domain";

export class Store {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path, { timeout: 5000 });
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL, data TEXT NOT NULL) STRICT",
    );
    this.db
      .prepare("INSERT OR IGNORE INTO state VALUES (1, 0, ?)")
      .run(JSON.stringify(emptyData()));
  }

  read(): StateSnapshot {
    const row = this.db
      .prepare("SELECT revision, data FROM state WHERE id = 1")
      .get();
    if (
      !row ||
      typeof row.revision !== "number" ||
      typeof row.data !== "string"
    ) {
      throw new Error("Estado do Compasso ausente no banco.");
    }
    return { revision: row.revision, data: parseBackup(row.data) };
  }

  write(revision: number, data: AppData): StateSnapshot | null {
    const result = this.db
      .prepare(
        "UPDATE state SET data = ?, revision = revision + 1 WHERE id = 1 AND revision = ?",
      )
      .run(JSON.stringify(data), revision);
    return result.changes === 1 ? { revision: revision + 1, data } : null;
  }

  close() {
    this.db.close();
  }
}
