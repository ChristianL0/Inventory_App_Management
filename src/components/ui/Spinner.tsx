export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-current"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-24 text-ink/40 dark:text-paper/40">
      <Spinner size={28} />
    </div>
  );
}
