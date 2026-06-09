import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import {
  Mail,
  Users,
  ShieldAlert,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  PenLine,
  ShieldCheck,
  Activity,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Overview {
  totalEmails: number;
  totalContacts: number;
  pendingApprovals: number;
  llmCostToday: number;
}

// Illustrative trend until the analytics time-series endpoint is wired.
const TREND = [
  { day: "Mon", emails: 42 }, { day: "Tue", emails: 68 },
  { day: "Wed", emails: 55 }, { day: "Thu", emails: 91 },
  { day: "Fri", emails: 74 }, { day: "Sat", emails: 30 },
  { day: "Sun", emails: 18 },
];

const PRODUCTS = [
  { name: "Denefits", dot: "#5B5BD6", reg: "PCI-DSS · CAN-SPAM" },
  { name: "Practina", dot: "#10B981", reg: "CAN-SPAM" },
  { name: "Lendee", dot: "#F59E0B", reg: "PCI-DSS · CAN-SPAM" },
  { name: "CoolCredit", dot: "#06B6D4", reg: "PCI-DSS · CAN-SPAM" },
  { name: "Credee", dot: "#8B5CF6", reg: "PCI-DSS · CAN-SPAM" },
  { name: "FinanceMutual", dot: "#EC4899", reg: "HIPAA · CAN-SPAM" },
  { name: "Recuvery", dot: "#F43F5E", reg: "FDCPA · CAN-SPAM" },
];

const COMPLIANCE = [
  { label: "Passed", value: 86, tone: "bg-success-500" },
  { label: "Needs review", value: 11, tone: "bg-warn-500" },
  { label: "Blocked", value: 3, tone: "bg-danger-500" },
];

function StatCard({
  label, value, icon: Icon, chip, delta, up, hero, loading, delay,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof Mail;
  chip: string;
  delta: string;
  up: boolean;
  hero?: boolean;
  loading?: boolean;
  delay: number;
}) {
  return (
    <div
      className={`card card-hover panel-pad animate-rise relative overflow-hidden ${
        hero ? "ring-1 ring-brand-200" : ""
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {hero && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-500/10 blur-2xl" />
      )}
      <div className="relative mb-4 flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-muted">{label}</span>
        <span className={`chip ${chip}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="tnum relative text-[30px] font-semibold leading-none text-ink">
        {loading ? (
          <span className="inline-block h-8 w-20 animate-pulse rounded-md bg-ink/[0.06]" />
        ) : (
          value
        )}
      </p>
      <div className="relative mt-3 flex items-center gap-1.5">
        <span
          className={`badge ${up ? "badge-success" : "badge-danger"} !px-2 !py-0.5`}
        >
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </span>
        <span className="text-xs text-ink-faint">vs last week</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<Overview>({
    queryKey: ["analytics/overview"],
    queryFn: () => apiClient.get("/analytics/overview").then((r) => r.data),
  });

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-rise">
          <p className="eyebrow">Overview</p>
          <h1 className="mt-1.5 text-[28px] font-bold sm:text-[32px]">Good to see you back</h1>
          <p className="mt-1 text-[14px] text-ink-muted">
            AI-checked outbound communication across all BridgingTech products.
          </p>
        </div>
        <Link to="/compose" className="btn btn-primary animate-rise" style={{ animationDelay: "80ms" }}>
          <PenLine className="h-4 w-4" />
          Compose email
        </Link>
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hero label="Emails Sent" icon={Mail} delay={60}
          chip="bg-brand-50 text-brand-600"
          value={data?.totalEmails ?? "—"} delta="12.4%" up loading={isLoading}
        />
        <StatCard
          label="Contacts" icon={Users} delay={120}
          chip="bg-success-50 text-success-600"
          value={data?.totalContacts ?? "—"} delta="4.1%" up loading={isLoading}
        />
        <StatCard
          label="Pending Approvals" icon={ShieldAlert} delay={180}
          chip="bg-warn-50 text-warn-600"
          value={data?.pendingApprovals ?? "—"} delta="2.0%" up={false} loading={isLoading}
        />
        <StatCard
          label="AI Cost Today" icon={DollarSign} delay={240}
          chip="bg-brand-50 text-brand-600"
          value={data ? `$${Number(data.llmCostToday).toFixed(2)}` : "—"}
          delta="6.8%" up={false} loading={isLoading}
        />
      </div>

      {/* ── Chart + Compliance ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Volume chart */}
        <div className="card panel-pad animate-rise lg:col-span-2" style={{ animationDelay: "300ms" }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Send volume</p>
              <h2 className="mt-1 text-lg font-semibold">This week</h2>
            </div>
            <span className="badge badge-neutral">
              <Activity className="h-3.5 w-3.5 text-brand-500" />
              Live
            </span>
          </div>
          <ResponsiveContainer width="100%" height={248}>
            <AreaChart data={TREND} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B5BD6" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#5B5BD6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#EEF0F4" vertical={false} />
              <XAxis
                dataKey="day" tickLine={false} axisLine={false}
                tick={{ fontSize: 12, fill: "#98A0B4", fontFamily: "Geist Mono" }}
              />
              <YAxis
                tickLine={false} axisLine={false}
                tick={{ fontSize: 12, fill: "#98A0B4", fontFamily: "Geist Mono" }}
              />
              <Tooltip
                cursor={{ stroke: "#5B5BD6", strokeWidth: 1, strokeDasharray: "4 4" }}
                contentStyle={{
                  borderRadius: 12, border: "1px solid #E6E8EF",
                  boxShadow: "0 10px 34px -10px rgba(12,17,29,0.18)", fontSize: 13,
                  fontFamily: "Geist",
                }}
                labelStyle={{ color: "#69718A", fontWeight: 600 }}
              />
              <Area
                type="monotone" dataKey="emails" stroke="#5B5BD6" strokeWidth={2.5}
                fill="url(#vol)" dot={false}
                activeDot={{ r: 5, fill: "#5B5BD6", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance health */}
        <div className="card panel-pad animate-rise" style={{ animationDelay: "360ms" }}>
          <div className="mb-5 flex items-center gap-2">
            <span className="chip bg-success-50 text-success-600">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="eyebrow">Compliance</p>
              <h2 className="mt-0.5 text-lg font-semibold">Health</h2>
            </div>
          </div>

          <div className="mb-6 flex items-baseline gap-2">
            <span className="tnum text-[34px] font-semibold leading-none text-ink">86</span>
            <span className="text-lg font-medium text-ink-faint">/ 100</span>
            <span className="badge badge-success ml-auto !py-0.5">Strong</span>
          </div>

          {/* stacked bar */}
          <div className="mb-5 flex h-2.5 overflow-hidden rounded-full bg-ink/[0.05]">
            {COMPLIANCE.map((c) => (
              <div key={c.label} className={c.tone} style={{ width: `${c.value}%` }} />
            ))}
          </div>

          <div className="space-y-3">
            {COMPLIANCE.map((c) => (
              <div key={c.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-soft">
                  <span className={`h-2.5 w-2.5 rounded-sm ${c.tone}`} />
                  {c.label}
                </span>
                <span className="tnum font-medium text-ink">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Products ─────────────────────────────────────────────── */}
      <div className="card panel-pad animate-rise" style={{ animationDelay: "420ms" }}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2 className="mt-1 text-lg font-semibold">Products</h2>
          </div>
          <span className="badge badge-neutral">7 active</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {PRODUCTS.map((p) => (
            <div
              key={p.name}
              className="group flex items-center gap-3 rounded-xl border border-line bg-canvas/60 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-surface hover:shadow-card"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-inset"
                style={{ background: p.dot, boxShadow: `0 0 0 4px ${p.dot}1a` }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                <p className="tnum truncate text-[11px] text-ink-faint">{p.reg}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
