import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/15 dark:border-paper/15 py-16 px-6 text-center">
      {icon && <div className="text-ink/25 dark:text-paper/25 mb-1">{icon}</div>}
      <p className="font-semibold text-ink dark:text-paper">{title}</p>
      {description && <p className="text-sm text-ink/55 dark:text-paper/55 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
