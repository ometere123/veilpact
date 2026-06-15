import { cn } from "@/lib/utils";

interface NetworkBadgeProps {
  network?: string;
  className?: string;
}

export function NetworkBadge({ network = "StudioNet", className }: NetworkBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs uppercase tracking-widest",
        "border-signal-violet/30 text-signal-violet bg-signal-violet/5",
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-signal-violet seal-pulse" />
      GenLayer · {network}
    </div>
  );
}
