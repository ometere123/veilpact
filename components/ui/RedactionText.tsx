import { cn } from "@/lib/utils";

interface RedactionTextProps {
  length?: number;
  className?: string;
  revealed?: boolean;
  children?: React.ReactNode;
}

export function RedactionText({ length = 24, className, revealed, children }: RedactionTextProps) {
  if (revealed && children) {
    return <span className={cn("text-parchment", className)}>{children}</span>;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block bg-parchment/90 text-transparent select-none rounded-[1px] h-[1em] align-middle",
        className,
      )}
      style={{ width: `${length * 0.55}rem` }}
    />
  );
}
