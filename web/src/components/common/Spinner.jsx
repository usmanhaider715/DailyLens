export function Spinner({ className = '' }) {
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
