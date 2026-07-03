import { formatCurrency } from "@/lib/utils/currency";

export function Currency({ value, className }: { value: number; className?: string }) {
  return (
    <span dir="ltr" className={className}>
      {formatCurrency(value)}
    </span>
  );
}
