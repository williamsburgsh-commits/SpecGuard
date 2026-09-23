import { NAV } from "@/lib/marketingCopy";
import { PhoenixTerminal } from "@/app/components/phoenix/PhoenixTerminal";

export const metadata = {
  title: NAV.phoenixPerps,
};

export default function PhoenixPage() {
  return <PhoenixTerminal />;
}
