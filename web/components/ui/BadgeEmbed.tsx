import { CodeBlock } from "./CodeBlock";
import { badgeUrlForWallet, buildEmbedHtml } from "@/lib/register/embedHtml";

export function BadgeEmbed({
  wallet,
  title = "Embed this badge",
}: {
  wallet: string;
  title?: string;
}) {
  const src = badgeUrlForWallet(wallet);
  const snippet = buildEmbedHtml(wallet);

  return (
    <div className="sg-card p-6">
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 font-mono text-xs break-all text-[#8888aa]">{src}</p>
      <div className="mt-6 overflow-hidden rounded-xl border border-[#ffffff0f] bg-[#08080f] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/badge/${wallet}`} alt="SpecGuard status badge" height={36} className="h-9 w-auto" />
      </div>
      <div className="mt-4">
        <CodeBlock code={snippet} />
      </div>
    </div>
  );
}
