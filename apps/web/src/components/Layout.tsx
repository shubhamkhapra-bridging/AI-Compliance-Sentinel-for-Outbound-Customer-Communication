import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PenLine,
  Megaphone,
  Users,
  ShieldCheck,
  BarChart3,
  LogOut,
  ShieldHalf,
  Inbox,
  BadgeCheck,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "../hooks/useAuthStore";
import clsx from "clsx";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const navGroups: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/compose", label: "Compose", icon: PenLine },
      { to: "/emails", label: "Email History", icon: Inbox },
      { to: "/campaigns", label: "Campaigns", icon: Megaphone },
      { to: "/contacts", label: "Contacts", icon: Users },
    ],
  },
  {
    heading: "Governance",
    items: [
      { to: "/approvals", label: "Approvals", icon: ShieldCheck },
      { to: "/validations", label: "Validations", icon: BadgeCheck },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    heading: "Account",
    items: [{ to: "/settings", label: "Settings", icon: SettingsIcon }],
  },
];

function initials(name?: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="relative hidden w-[264px] shrink-0 flex-col bg-sidebar text-white md:flex">
        {/* ambient glow */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl animate-glow-pulse" />

        {/* Brand */}
        <div className="relative flex items-center gap-3 px-6 py-[1.4rem]">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <ShieldHalf className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-bold tracking-tight">Sentinel</p>
            <p className="text-[11px] font-medium text-white/45">Compliance Cloud</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto px-3.5 pb-4">
          {navGroups.map((group) => (
            <div key={group.heading} className="mb-5">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                {group.heading}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      clsx(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200",
                        isActive
                          ? "bg-white/[0.07] text-white"
                          : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={clsx(
                            "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400 transition-all duration-200",
                            isActive ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <Icon
                          className={clsx(
                            "h-[18px] w-[18px] shrink-0 transition-colors",
                            isActive ? "text-brand-300" : "text-white/45 group-hover:text-white/80"
                          )}
                        />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="relative m-3.5 rounded-2xl border border-sidebar-line bg-sidebar-elev p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[12px] font-bold text-white">
              {initials(user?.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {user?.fullName ?? "User"}
              </p>
              <p className="truncate text-[11px] text-white/45">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface/80 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="badge badge-brand">
              <Sparkles className="h-3.5 w-3.5" />
              Outbound Intelligence
            </span>
            <span className="hidden text-[13px] text-ink-muted sm:inline">
              7 products · GDPR · CAN-SPAM · FDCPA
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
              </span>
              Systems operational
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[12px] font-bold text-white md:hidden">
              {initials(user?.fullName)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="relative flex-1 overflow-auto bg-grid">
          <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">{children}</div>
        </main>
      </div>
    </div>
  );
}
