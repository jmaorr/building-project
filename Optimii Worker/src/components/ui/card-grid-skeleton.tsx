interface CardGridSkeletonProps {
  count?: number;
  gridClassName?: string;
  heightClassName?: string;
}

export function CardGridSkeleton({
  count = 6,
  gridClassName = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
  heightClassName = "h-64",
}: CardGridSkeletonProps) {
  return (
    <div className={gridClassName}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${heightClassName} rounded-lg border bg-card animate-pulse`}
        />
      ))}
    </div>
  );
}
