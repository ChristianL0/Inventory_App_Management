import { Link, NavLink, useNavigate } from "react-router-dom";
import { Boxes, Moon, Sun, LogOut, LayoutDashboard, Package, Truck } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
];

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 dark:border-paper/10 bg-paper/90 dark:bg-ink/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-ink dark:text-paper">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white">
            <img src="/logo_iulius.png" alt="Logo" className="h-full w-full object-contain" />
          </span>
          <span className="hidden sm:inline tracking-tight">Sample Tracker - Iulius</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-signal-50 text-signal-700 dark:bg-signal-500/15 dark:text-signal-300"
                    : "text-ink/60 hover:bg-ink/5 dark:text-paper/60 dark:hover:bg-paper/5"
                }`
              }
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={toggleTheme}
          className="btn-ghost !px-2"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {user && (
          <div className="flex items-center gap-2 border-l border-ink/10 dark:border-paper/10 pl-3">
            <div className="hidden sm:block text-right leading-tight">
              <p className="text-xs font-medium text-ink dark:text-paper">{user.email}</p>
              <p className="text-[11px] uppercase tracking-wide text-ink/45 dark:text-paper/45">{role}</p>
            </div>
            <button onClick={handleSignOut} className="btn-ghost !px-2" aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
