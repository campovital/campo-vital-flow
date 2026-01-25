import { cn } from "@/lib/utils";

interface OverdueBadgeProps {
  count: number;
  className?: string;
}

export function OverdueBadge({ count, className }: OverdueBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground",
        count > 9 && "w-6",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
