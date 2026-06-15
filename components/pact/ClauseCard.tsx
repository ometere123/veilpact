import { cn } from "@/lib/utils";
import { Lock, Eye } from "lucide-react";
import { RedactionText } from "@/components/ui/RedactionText";
import { motion } from "framer-motion";

interface ClauseCardProps {
  index: number;
  title: string;
  type: string;
  revealed?: boolean;
  text?: string;
  commitment?: string;
  sensitivity?: string;
  className?: string;
}

export function ClauseCard({
  index,
  title,
  type,
  revealed,
  text,
  commitment,
  sensitivity,
  className,
}: ClauseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "border rounded-sm p-4 bg-obsidian relative group",
        revealed
          ? "border-redaction-rose/40 bg-redaction-rose/5"
          : "border-bone-border hover:border-parchment/20",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-muted-parchment">
            #{String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="font-body text-sm text-parchment font-medium">{title}</p>
            <p className="font-mono text-xs text-muted-parchment uppercase tracking-widest mt-0.5">{type}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {sensitivity && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-sm uppercase tracking-widest border font-mono",
              sensitivity === "HIGH"
                ? "text-redaction-rose border-redaction-rose/30 bg-redaction-rose/5"
                : sensitivity === "MEDIUM"
                ? "text-sealed-gold border-sealed-gold/30 bg-sealed-gold/5"
                : "text-muted-parchment border-bone-border",
            )}>
              {sensitivity}
            </span>
          )}
          {revealed ? (
            <Eye className="w-3.5 h-3.5 text-redaction-rose" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-muted-parchment" />
          )}
        </div>
      </div>

      <div className="mt-3">
        {revealed && text ? (
          <p className="text-sm text-parchment/80 leading-relaxed aperture-reveal">{text}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <RedactionText length={30} />
            <RedactionText length={20} />
          </div>
        )}
      </div>

      {commitment && (
        <div className="mt-3 pt-3 border-t border-bone-border">
          <span className="font-mono text-xs text-muted-parchment">
            {commitment.slice(0, 10)}...{commitment.slice(-6)}
          </span>
        </div>
      )}
    </motion.div>
  );
}
