import { Suspense } from "react";
import { listAgents } from "@/lib/agents/listAgents";
import { RegistryClient } from "@/app/components/RegistryTable";
import { getSupabasePublic } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  sort?: string;
  order?: string;
};

export default async function RegistryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const status =
    searchParams.status === "GREEN" || searchParams.status === "RED"
      ? searchParams.status
      : "all";
  const sort =
    searchParams.sort === "registered_at" ||
    searchParams.sort === "name" ||
    searchParams.sort === "pnl"
      ? searchParams.sort
      : "days_active";
  const order = searchParams.order === "asc" ? "asc" : "desc";

  const supabase = getSupabasePublic();
  const agents = await listAgents(supabase, { status, sort, order });
  const allAgents =
    status === "all" ? agents : await listAgents(supabase, { status: "all", sort, order });

  const total = allAgents.length;
  const green = allAgents.filter((a) => a.status === "GREEN").length;
  const red = allAgents.filter((a) => a.status === "RED").length;

  return (
    <div className="sg-shell pb-24 pt-32">
      <header>
        <h1 className="sg-headline">Agent Registry</h1>
        <p className="mt-4 text-[#8888aa]">
          {total} agents registered. {green} verified. {red} breached.
        </p>
      </header>

      <div className="mt-12">
        <Suspense fallback={<p className="text-[#8888aa]">Loading filters…</p>}>
          <RegistryClient
            initialAgents={agents}
            initialStatus={status}
            initialSort={sort}
            initialOrder={order}
          />
        </Suspense>
      </div>
    </div>
  );
}
