import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FactorsEditor } from "./factors-editor";

export default async function FactorsPage() {
  const supabase = await createClient();

  const { data: zones } = await supabase
    .from("distance_zones")
    .select("id, name, distance_factor")
    .order("distance_factor", { ascending: true });

  return (
    <div className="min-h-screen bg-muted pb-24">
      <header className="sticky top-0 bg-card border-b border-border z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/settings" className="p-3 -ml-3 text-muted-foreground">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-foreground flex-1">거리·난이도 계수</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6">
        <p className="text-base text-muted-foreground mb-6">
          견적 금액에 곱해지는 계수예요. 현장 상황에 맞게 조정하세요.
        </p>
        <FactorsEditor zones={(zones as unknown as { id: string; name: string; distance_factor: number }[]) ?? []} />
      </div>
    </div>
  );
}
