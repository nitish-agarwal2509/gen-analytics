export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
      </span>
      Analyzing your data...
    </div>
  );
}
