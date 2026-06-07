import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PenLine,
  Megaphone,
  Users,
  ShieldCheck,
  BarChart3,
  LogOut,
  Mail,
  Inbox,
} from "lucide-react";
import { useAuthStore } from "../hooks/useAuthStore";
import clsx from "clsx";

const nav = [
  { to: "/dashboard", label: "Dashboard",     icon: LayoutDashboard },
  { to: "/compose",   label: "Compose",       icon: PenLine },
  { to: "/emails",    label: "Email History", icon: Inbox },
  { to: "/campaigns", label: "Campaigns",     icon: Megaphone },
  { to: "/contacts",  label: "Contacts",      icon: Users },
  { to: "/approvals", label: "Approvals",     icon: ShieldCheck },
  { to: "/analytics", label: "Analytics",     icon: BarChart3 },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-gray-900 text-white shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-700">
          <div className="p-1.5 bg-brand-500 rounded-lg">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">AI Compliance</p>
            <p className="text-xs text-gray-400 leading-tight">Sentinel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName ?? "User"}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
