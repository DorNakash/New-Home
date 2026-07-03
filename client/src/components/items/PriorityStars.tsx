import { Star } from "lucide-react";

const PRIORITY_TO_STARS: Record<string, number> = {
  LOW: 2,
  MEDIUM: 3,
  HIGH: 5,
};

export function PriorityStars({ priority }: { priority: string }) {
  const count = PRIORITY_TO_STARS[priority] ?? 3;
  return (
    <div className="flex gap-0.5" aria-label={`עדיפות: ${priority}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}
