import { getDb, type OutboxEntry } from "./db";
import { addFinanceEntry } from "@/app/(app)/finance/actions";

export type ActionName = "addFinanceEntry";

interface FinancePayload {
  direction: string;
  category: string;
  amount: number;
  paidAt: string;
  memo: string | null;
  siteId: string | null;
}

type Payload = FinancePayload;

/** 오프라인 아웃박스에 작업 추가 */
export async function enqueue(action: ActionName, payload: Payload): Promise<void> {
  const db = getDb();
  await db.outbox.add({
    action,
    payload: JSON.stringify(payload),
    status: "pending",
    failCount: 0,
    createdAt: Date.now(),
  });
}

/** 미처리 항목 수 반환 */
export async function pendingCount(): Promise<number> {
  const db = getDb();
  return db.outbox.where("status").anyOf(["pending", "failed"]).count();
}

/** 모든 미처리 아웃박스 항목 동기화 (온라인 복귀 시 호출) */
export async function syncOutbox(): Promise<{ synced: number; errors: number }> {
  const db = getDb();
  const items = await db.outbox
    .where("status")
    .anyOf(["pending", "failed"])
    .toArray();

  let synced = 0;
  let errors = 0;

  for (const item of items) {
    if ((item.failCount ?? 0) >= 5) {
      // 5회 실패 → 포기
      await db.outbox.update(item.id!, { status: "failed" });
      errors++;
      continue;
    }

    await db.outbox.update(item.id!, { status: "syncing" });

    try {
      const result = await replayAction(item);
      if (result.ok) {
        await db.outbox.delete(item.id!);
        synced++;
      } else {
        await db.outbox.update(item.id!, {
          status: "failed",
          failCount: (item.failCount ?? 0) + 1,
          errorMsg: result.error,
        });
        errors++;
      }
    } catch (e) {
      await db.outbox.update(item.id!, {
        status: "failed",
        failCount: (item.failCount ?? 0) + 1,
        errorMsg: e instanceof Error ? e.message : "알 수 없는 오류",
      });
      errors++;
    }
  }

  return { synced, errors };
}

async function replayAction(item: OutboxEntry): Promise<{ ok: boolean; error?: string }> {
  const payload = JSON.parse(item.payload) as Payload;

  if (item.action === "addFinanceEntry") {
    const p = payload as FinancePayload;
    const fd = new FormData();
    fd.set("direction", p.direction);
    fd.set("category", p.category);
    fd.set("amount", String(p.amount));
    fd.set("paid_at", p.paidAt);
    if (p.memo) fd.set("memo", p.memo);
    if (p.siteId) fd.set("site_id", p.siteId);
    return addFinanceEntry(fd);
  }

  return { ok: false, error: `알 수 없는 액션: ${item.action}` };
}
