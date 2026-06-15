import { cn } from "@/lib/utils";

interface WalletStatusPillProps {
  address?: string;
  connected: boolean;
  className?: string;
}

export function WalletStatusPill({ address, connected, className }: WalletStatusPillProps) {
  const short = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Not connected";

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-mono",
        connected
          ? "border-verdict-green/30 text-verdict-green bg-verdict-green/5"
          : "border-bone-border text-muted-parchment",
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", connected ? "bg-verdict-green seal-pulse" : "bg-muted-parchment/40")} />
      {short}
    </div>
  );
}
