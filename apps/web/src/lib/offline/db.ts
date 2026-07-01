import Dexie, { type EntityTable } from "dexie";

export interface OutboxEntry {
  id?: number;
  action: string;          // 서버 액션 식별자 (예: "addFinanceEntry")
  payload: string;         // JSON.stringify된 페이로드
  status: "pending" | "syncing" | "failed";
  failCount: number;
  createdAt: number;       // Date.now()
  errorMsg?: string;
}

class InteriorOsDB extends Dexie {
  outbox!: EntityTable<OutboxEntry, "id">;

  constructor() {
    super("interior-os");
    this.version(1).stores({
      outbox: "++id, action, status, createdAt",
    });
  }
}

let _db: InteriorOsDB | null = null;

export function getDb(): InteriorOsDB {
  if (!_db) _db = new InteriorOsDB();
  return _db;
}
