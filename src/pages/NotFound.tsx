import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="font-mono text-sm text-ink/40 dark:text-paper/40">404</p>
      <h1 className="text-xl font-bold text-ink dark:text-paper">Page not found</h1>
      <Link to="/" className="btn-primary mt-2">
        Back to dashboard
      </Link>
    </div>
  );
}
