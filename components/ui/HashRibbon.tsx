import { cn } from "@/lib/utils";

interface HashRibbonProps {
  label: string;
  hash: string;
  className?: string;
  color?: "blue" | "violet" | "gold" | "green";
}

const colors = {
  blue:   "text-clause-blue border-clause-blue/30 bg-clause-blue/5",
  violet: "text-signal-violet border-signal-violet/30 bg-signal-violet/5",
  gold:   "text-sealed-gold border-sealed-gold/30 bg-sealed-gold/5",
  green:  "text-verdict-green border-verdict-green/30 bg-verdict-green/5",
};

export function HashRibbon({ label, hash, className, color = "blue" }: HashRibbonProps) {
  const short = hash.length > 16
    ? `${hash.slice(0, 10)}...${hash.slice(-6)}`
    : hash;

  return (
    <div className={cn("flex items-center gap-2 border px-3 py-1.5 rounded-sm text-xs", colors[color], className)}>
      <span className="text-muted-parchment uppercase tracking-widest font-body">{label}</span>
      <span className="font-mono ml-auto">{short}</span>
    </div>
  );
}
