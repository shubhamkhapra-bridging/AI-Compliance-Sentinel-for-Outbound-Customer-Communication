import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import {
  ShieldCheck, CheckCircle2, AlertTriangle, Percent,
  Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

interface Issue {
  type: string;
  what: string;
  why: string;
  howToFix?: string;
  how_to_fix?: string;
  severity: string;
}

interface Validation {
  id: string;
  subject: string;
  bodyPreview: string | null;
  passed: boolean;
  riskScore: number;
  issues: Issue[];
  correctedSubject: string | null;
  correctedBody: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  passed: number;
  flagged: number;
  passRate: number;
  series: { date: string; passed: number; flagged: number }[];
}

const SEVERITY_CLS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: typeof ShieldCheck; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <span className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function ValidationRow({ v }: { v: Validation }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-900 truncate max-w-xs">{v.subject}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          {v.passed ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3" /> Passed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <AlertTriangle className="w-3 h-3" /> Flagged
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{v.riskScore}/100</td>
        <td className="px-4 py-3 text-sm text-gray-500">{v.issues?.length ?? 0}</td>
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(v.createdAt)}</td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={5} className="px-6 py-4 space-y-4">
            {(v.issues ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Issues</p>
                <div className="space-y-2">
                  {v.issues.map((i, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_CLS[i.severity] ?? "bg-gray-100 text-gray-600"}`}>
                          {i.severity} · {i.type}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{i.what}</span>
                      </div>
                      <p className="text-xs text-gray-600"><b>Why:</b> {i.why}</p>
                      <p className="text-xs text-gray-600"><b>How to fix:</b> {i.howToFix ?? i.how_to_fix}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(v.correctedSubject || v.correctedBody) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Suggested correction</p>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">{v.correctedSubject}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{v.correctedBody}</p>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function Validations() {
  const [offset, setOffset] = useState(0);
  const limit = 15;

  const { data: stats } = useQuery<Stats>({
    queryKey: ["validation-stats"],
    queryFn: () => apiClient.get("/validations/stats").then((r) => r.data),
  });

  const { data, isLoading } = useQuery<{ validations: Validation[]; total: number }>({
    queryKey: ["validations", offset],
    queryFn: () =>
      apiClient.get("/validations", { params: { limit, offset } }).then((r) => r.data),
  });

  const validations = data?.validations ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const page = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Validations</h1>
        <p className="text-gray-500 mt-1">Pre-send checks: correct vs flagged emails</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Total Checked" value={stats?.total ?? 0} icon={ShieldCheck} color="bg-blue-50 text-blue-600" />
        <StatCard label="Passed" value={stats?.passed ?? 0} icon={CheckCircle2} color="bg-green-50 text-green-600" />
        <StatCard label="Flagged" value={stats?.flagged ?? 0} icon={AlertTriangle} color="bg-red-50 text-red-600" />
        <StatCard label="Pass Rate" value={`${stats?.passRate ?? 0}%`} icon={Percent} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3Icon />
          <h2 className="font-semibold text-gray-900">Correct vs Flagged (last 30 days)</h2>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={stats?.series ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="passed" name="Passed" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="flagged" name="Flagged" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : validations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <ShieldCheck className="w-8 h-8" />
            <p className="text-sm">No validations yet</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Subject", "Result", "Risk", "Issues", "Checked At"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {validations.map((v) => <ValidationRow key={v.id} v={v} />)}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={page === 1}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={page === totalPages}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BarChart3Icon() {
  return <ShieldCheck className="w-5 h-5 text-brand-600" />;
}
