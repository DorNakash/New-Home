import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants/status";

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status] ?? status}</Badge>;
}
