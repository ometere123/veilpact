import { cn } from "@/lib/utils";
import { HardDrive, AlertTriangle, CheckCircle2 } from "lucide-react";

interface LocalPackageStatusProps {
  found: boolean;
  downloaded?: boolean;
  className?: string;
}

export function LocalPackageStatus({ found, downloaded, className }: LocalPackageStatusProps) {
  return (
    <div className={cn("flex flex-col gap-1 text-xs", className)}>
      <div className={cn("flex items-center gap-1.5", found ? "text-verdict-green" : "text-redaction-rose")}>
        {found ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
        <span>Local package: {found ? "Found" : "Not found"}</span>
      </div>
      {downloaded !== undefined && (
        <div className={cn("flex items-center gap-1.5 pl-0.5", downloaded ? "text-muted-parchment" : "text-sealed-gold")}>
          <HardDrive className="w-3 h-3" />
          <span>Backup: {downloaded ? "Downloaded" : "Not downloaded"}</span>
        </div>
      )}
    </div>
  );
}
