import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, TrendingUpIcon, UsersIcon, BrainIcon, DollarSignIcon } from "lucide-react";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "whddn1545@gmail.com";

const MODEL_COST: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8":    { input: 0.000015, output: 0.000075 },
  "claude-sonnet-4-6":  { input: 0.000003, output: 0.000015 },
  "claude-haiku-4-5":   { input: 0.00000025, output: 0.00000125 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_COST[model] ?? { input: 0.000003, output: 0.000015 };
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: tenants }, { data: aiLogs }, { data: recentUsers }] = await Promise.all([
    supabase.from("tenants").select("id, business_name, owner_name, plan, created_at").order("created_at", { ascending: false }),
    supabase
      .from("ai_invocations")
      .select("id, task, model, input_tokens, output_tokens, latency_ms, created_at, tenant_id")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("users")
      .select("id, display_name, role, tenant_id, created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // 비용 집계
  const totalCostUsd = (aiLogs ?? []).reduce((sum, log) => {
    const l = log as unknown as { model: string; input_tokens: number; output_tokens: number };
    return sum + estimateCost(l.model, l.input_tokens ?? 0, l.output_tokens ?? 0);
  }, 0);

  // 모델별 집계
  const byModel = new Map<string, { calls: number; cost: number }>();
  for (const log of aiLogs ?? []) {
    const l = log as unknown as { model: string; input_tokens: number; output_tokens: number };
    const entry = byModel.get(l.model) ?? { calls: 0, cost: 0 };
    entry.calls++;
    entry.cost += estimateCost(l.model, l.input_tokens ?? 0, l.output_tokens ?? 0);
    byModel.set(l.model, entry);
  }

  // task별 집계
  const byTask = new Map<string, number>();
  for (const log of aiLogs ?? []) {
    const task = (log as unknown as { task: string }).task;
    byTask.set(task, (byTask.get(task) ?? 0) + 1);
  }

  const PLAN_LABEL: Record<string, string> = { basic: "Basic", pro: "Pro", team: "Team" };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-card border-b border-border z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-2 -ml-2 text-muted-foreground">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-foreground">관리자 콘솔</h1>
        <span className="ml-auto text-sm text-muted-foreground/60">최근 30일</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4">
            <UsersIcon size={20} className="text-blue-600 mb-2" />
            <p className="text-3xl font-black text-foreground">{(tenants ?? []).length}</p>
            <p className="text-sm text-muted-foreground">전체 테넌트</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <BrainIcon size={20} className="text-purple-600 mb-2" />
            <p className="text-3xl font-black text-foreground">{(aiLogs ?? []).length}</p>
            <p className="text-sm text-muted-foreground">AI 호출 (30일)</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <DollarSignIcon size={20} className="text-green-600 mb-2" />
            <p className="text-3xl font-black text-foreground">${totalCostUsd.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">AI 비용 (30일)</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <TrendingUpIcon size={20} className="text-amber-600 mb-2" />
            <p className="text-3xl font-black text-foreground">{(recentUsers ?? []).length}</p>
            <p className="text-sm text-muted-foreground">신규 사용자 (30일)</p>
          </div>
        </div>

        {/* 모델별 비용 */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-lg font-bold text-foreground mb-3">모델별 AI 비용</h2>
          <div className="space-y-2">
            {Array.from(byModel.entries()).sort((a, b) => b[1].cost - a[1].cost).map(([model, data]) => (
              <div key={model} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-base font-semibold text-foreground">{model}</p>
                  <p className="text-sm text-muted-foreground">{data.calls.toLocaleString()}회</p>
                </div>
                <p className="text-lg font-bold text-foreground/90">${data.cost.toFixed(3)}</p>
              </div>
            ))}
            {byModel.size === 0 && <p className="text-muted-foreground/60 text-base text-center py-4">AI 호출 없음</p>}
          </div>
        </div>

        {/* 기능별 호출 횟수 */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-lg font-bold text-foreground mb-3">기능별 AI 사용</h2>
          <div className="space-y-2">
            {Array.from(byTask.entries()).sort((a, b) => b[1] - a[1]).map(([task, count]) => (
              <div key={task} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <p className="text-base text-foreground/90 font-medium">{task}</p>
                <span className="bg-purple-100 text-purple-700 text-sm font-bold px-3 py-1 rounded-full">{count}회</span>
              </div>
            ))}
          </div>
        </div>

        {/* 테넌트 목록 */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-lg font-bold text-foreground mb-3">테넌트 목록</h2>
          <div className="space-y-2">
            {(tenants ?? []).map((t) => {
              const tAny = t as unknown as Record<string, unknown>;
              return (
                <div key={tAny.id as string} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-base font-semibold text-foreground">{tAny.business_name as string}</p>
                    <p className="text-sm text-muted-foreground">{tAny.owner_name as string} · {new Date(tAny.created_at as string).toLocaleDateString("ko-KR")}</p>
                  </div>
                  <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${
                    tAny.plan === "pro" ? "bg-blue-100 text-blue-700"
                    : tAny.plan === "team" ? "bg-purple-100 text-purple-700"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {PLAN_LABEL[tAny.plan as string] ?? tAny.plan as string}
                  </span>
                </div>
              );
            })}
            {!tenants || tenants.length === 0 && (
              <p className="text-muted-foreground/60 text-base text-center py-4">테넌트 없음</p>
            )}
          </div>
        </div>

        {/* 최근 가입자 */}
        {recentUsers && recentUsers.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-lg font-bold text-foreground mb-3">최근 가입자</h2>
            <div className="space-y-2">
              {(recentUsers as unknown as Record<string, unknown>[]).map((u) => (
                <div key={u.id as string} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <p className="text-base text-foreground/90">{u.display_name as string ?? "이름 없음"}</p>
                  <p className="text-sm text-muted-foreground">{new Date(u.created_at as string).toLocaleDateString("ko-KR")}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
