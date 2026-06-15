import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CommitmentFingerprintProps {
  hash: string;
  label?: string;
  verified?: boolean;
  className?: string;
}

function hashToSegments(hash: string): string[] {
  const clean = hash.replace("0x", "").padEnd(64, "0");
  const segs: string[] = [];
  for (let i = 0; i < 64; i += 8) {
    segs.push(clean.slice(i, i + 8));
  }
  return segs;
}

function hexToIntensity(hex: string): number {
  return parseInt(hex, 16) / 0xffffffff;
}

export function CommitmentFingerprint({ hash, label, verified, className }: CommitmentFingerprintProps) {
  const segments = hashToSegments(hash);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <p className="text-xs text-muted-parchment uppercase tracking-widest">{label}</p>
      )}
      <div className="flex gap-0.5">
        {segments.map((seg, i) => {
          const intensity = hexToIntensity(seg);
          return (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              className="flex-1 rounded-[1px]"
              style={{
                height: `${20 + intensity * 20}px`,
                backgroundColor: verified
                  ? `rgba(110,159,126,${0.3 + intensity * 0.7})`
                  : `rgba(126,167,201,${0.3 + intensity * 0.7})`,
              }}
            />
          );
        })}
      </div>
      <p className="font-mono text-xs text-muted-parchment break-all">
        {hash.slice(0, 18)}...{hash.slice(-6)}
      </p>
    </div>
  );
}
