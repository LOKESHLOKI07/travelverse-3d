import { Badge } from "@/components/ui/badge";

/** Shows remaining vs total seats for fixed-date / trek batches. */
export function FixedBatchSeatBadge({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  if (remaining === 0) {
    return (
      <Badge style={{ background: "oklch(0.45 0.18 25)", color: "white" }}>
        Sold out · 0 / {total}
      </Badge>
    );
  }
  if (remaining <= 5) {
    return (
      <Badge
        style={{
          background: "oklch(0.6 0.18 55)",
          color: "oklch(0.1 0.02 55)",
        }}
      >
        {remaining} of {total} left
      </Badge>
    );
  }
  return (
    <Badge style={{ background: "oklch(0.55 0.18 145)", color: "white" }}>
      {remaining} / {total} seats
    </Badge>
  );
}
