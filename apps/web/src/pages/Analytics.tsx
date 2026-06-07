import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { BarChart3, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

export default function Analytics() {
  const { data: usage = [], isLoading } = useQuery({
    queryKey: ["analytics/llm-usage"],
    queryFn: () =>
      apiClient.get("/analytics/llm-usage", { params: { days: 14 } }).then((r) => r.data),
  });

  const chartData = usage.reduce((acc: any[], row: any) => {
    const existing = acc.find((r) => r.date === row.usageDate);
    if (existing) {
      existing.cost = (parseFloat(existing.cost) + parseFloat(row._sum?.totalCostUsd ?? 0)).toFixed(4);
      existing.calls += row._sum?.totalCalls ?? 0;
    } else {
      acc.push({
        date: new Date(row.usageDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cost: parseFloat(row._sum?.totalCostUsd ?? 0).toFixed(4),
        calls: row._sum?.totalCalls ?? 0,
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">LLM usage, costs, and email performance</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-5 h-5 text-brand-600" />
              <h2 className="font-semibold text-gray-900">Daily AI Cost (USD)</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`$${v}`, "Cost"]} />
                <Bar dataKey="cost" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900">Daily AI Calls</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="calls" fill="#9333ea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
