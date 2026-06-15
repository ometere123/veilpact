import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface DossierCardProps {
  children: ReactNode;
  className?: string;
  noPad?: boolean;
  gold?: boolean;
}

export function DossierCard({ children, className, noPad, gold }: DossierCardProps) {
  return (
    <div
      className={cn(
        "bg-obsidian border rounded-sm relative",
        gold ? "border-sealed-gold/40" : "border-bone-border",
        !noPad && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
