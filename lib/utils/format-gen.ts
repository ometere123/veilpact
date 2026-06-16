export function formatGEN(wei: string | bigint | number | undefined | null): string {
  try {
    const n = BigInt(wei ?? 0);
    if (n === BigInt(0)) return "0";
    const whole = n / BigInt("1000000000000000000");
    const frac  = n % BigInt("1000000000000000000");
    if (frac === BigInt(0)) return whole.toString();
    return `${whole}.${frac.toString().padStart(18, "0").replace(/0+$/, "")}`;
  } catch { return "0"; }
}
