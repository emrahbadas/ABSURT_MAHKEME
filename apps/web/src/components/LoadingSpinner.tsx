export function LoadingSpinner({ label = "Yukleniyor..." }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-textSecondary">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-textSecondary border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}
