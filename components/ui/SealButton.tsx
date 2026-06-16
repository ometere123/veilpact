import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Variant = "gold" | "violet" | "ghost" | "danger" | "outline";

interface SealButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children?: ReactNode;
}

const variants: Record<Variant, string> = {
  gold:    "bg-sealed-gold text-void-ink hover:bg-sealed-gold/90 border-sealed-gold",
  violet:  "bg-signal-violet text-parchment hover:bg-signal-violet/90 border-signal-violet",
  ghost:   "bg-transparent text-muted-parchment hover:text-parchment hover:bg-white/5 border-bone-border",
  danger:  "bg-redaction-rose/10 text-redaction-rose hover:bg-redaction-rose/20 border-redaction-rose/40",
  outline: "bg-transparent text-parchment hover:bg-white/5 border-bone-border",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs tracking-widest",
  md: "px-5 py-2.5 text-sm tracking-widest",
  lg: "px-7 py-3.5 text-base tracking-widest",
};

export function SealButton({
  variant = "gold",
  size = "md",
  loading = false,
  children,
  className,
  disabled,
  ...props
}: SealButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-heading border uppercase",
        "transition-all duration-150 cursor-pointer select-none rounded-sm",
        variants[variant],
        sizes[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed pointer-events-none",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
}
