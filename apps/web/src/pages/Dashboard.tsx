import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { Mail, Users, ShieldAlert, DollarSign, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Overview {
  totalEmails: number;
  totalContacts: number;
  pendingApprovals: number;
  llmCostToday: number;
}

const MOCK_TREND = [
  { day: "Mon", emails: 42 }, { day: "Tue", emails: 68 },
  { day: "Wed", emails: 55 }, { day: "Thu", emails: 91 },
  { day: "Fri", emails: 74 }, { day: "Sat", emails: 30 },
  { day: "Sun", emails: 18 },
];

export default function Dashboard() {
  const { data, isLoading } = useQuery<Overview>({
    queryKey: ["analytics/overview"],
    queryFn: () => apiClient.get("/analytics/overview").then((r) => r.data),
  });

  const stats = [
    {
      label: "Emails Sent",
      value: data?.totalEmails ?? "—",
      icon: Mail,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Contacts",
      value: data?.totalContacts ?? "—",
      icon: Users,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Pending Approvals",
      value: data?.pendingApprovals ?? "—",
      icon: ShieldAlert,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "AI Cost Today",
      value: data ? `$${Number(data.llmCostToday).toFixed(2)}` : "—",
      icon: DollarSign,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">AI Compliance Sentinel — BridgingTech</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <span className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <span className="inline-block w-16 h-7 bg-gray-100 animate-pulse rounded" />
              ) : (
                value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-gray-900">Emails This Week</h2>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={MOCK_TREND}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="emails"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Products overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Products</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {["Denefits", "Practina", "Lendee", "CoolCredit", "Credee", "FinanceMutual", "Recuvery"].map(
            (p) => (
              <div
                key={p}
                className="text-center py-3 px-2 bg-gray-50 rounded-lg border border-gray-100"
              >
                <p className="text-xs font-medium text-gray-700">{p}</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
