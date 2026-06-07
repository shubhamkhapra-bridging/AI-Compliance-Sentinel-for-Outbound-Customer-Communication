import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import {
  Mail, CheckCircle2, Clock, XCircle, Eye, EyeOff,
  Loader2, ChevronDown, ChevronUp,
} from "lucide-react";

interface EmailEvent { eventType: string; occurredAt: string; }
interface EmailRecipient { emailAddress: string; recipientType: string; }
interface Product { name: string; slug: string; }

interface SentEmail {
  id: string;
  subject: string;
  bodyHtml: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  riskScore: number | null;
  recipients: EmailRecipient[];
  events: EmailEvent[];
  product: Product | null;
}

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  sent:             { label: "Sent",             cls: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  queued:           { label: "Queued",           cls: "bg-blue-100 text-blue-700",    icon: Clock },
  scheduled:        { label: "Scheduled",        cls: "bg-purple-100 text-purple-700",icon: Clock },
  pending_approval: { label: "Pending Approval", cls: "bg-amber-100 text-amber-700",  icon: Clock },
  failed:           { label: "Failed",           cls: "bg-red-100 text-red-700",      icon: XCircle },
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { label: status, cls: "bg-gray-100 text-gray-600", icon: Clock };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      <Icon className="w-3 h-3" /> {s.label}
    </span>
  );
}

function EmailRow({ email }: { email: SentEmail }) {
  const [expanded, setExpanded] = useState(false);
  const opened = email.events.length > 0;
  const openedAt = opened ? email.events[0].occurredAt : null;
  const recipient = email.recipients.find((r) => r.recipientType === "to")?.emailAddress ?? "—";

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
            <span className="text-sm font-medium text-gray-900 truncate max-w-xs">{email.subject}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">{recipient}</td>
        <td className="px-4 py-3 text-xs text-gray-500">{email.product?.name ?? "—"}</td>
        <td className="px-4 py-3"><StatusBadge status={email.status} /></td>
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(email.sentAt ?? email.createdAt)}</td>
        <td className="px-4 py-3">
          {opened ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
              <Eye className="w-3.5 h-3.5" /> Opened
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <EyeOff className="w-3.5 h-3.5" /> Not opened
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(openedAt)}</td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={7} className="px-6 py-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">HTML Preview</span>
              {email.riskScore !== null && (
                <span className="text-xs text-gray-400">Risk Score: {email.riskScore}/100</span>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <iframe
                srcDoc={email.bodyHtml}
                title={`Preview — ${email.subject}`}
                className="w-full"
                style={{ height: 360 }}
                sandbox="allow-same-origin"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function EmailHistory() {
  const [offset, setOffset] = useState(0);
  const limit = 15;

  const { data, isLoading } = useQuery<{ emails: SentEmail[]; total: number }>({
    queryKey: ["emails", offset],
    queryFn: () =>
      apiClient.get("/emails", { params: { limit, offset } }).then((r) => r.data),
  });

  const emails = data?.emails ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const page = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email History</h1>
          <p className="text-gray-500 mt-1">All sent emails with open tracking</p>
        </div>
        <span className="text-sm text-gray-400">{total} email{total !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <Mail className="w-8 h-8" />
            <p className="text-sm">No emails sent yet</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Subject", "Recipient", "Product", "Status", "Sent At", "Opened", "Open Time"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <EmailRow key={email.id} email={email} />
              ))}
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
