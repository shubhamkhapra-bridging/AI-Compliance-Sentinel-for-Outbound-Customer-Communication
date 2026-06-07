import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { ShieldCheck, ShieldX, Clock, Loader2 } from "lucide-react";

interface ApprovalRequest {
  id: string;
  status: string;
  expiresAt: string;
  email: {
    id: string;
    subject: string;
    product: { name: string };
    riskAssessment: { riskScore: number; riskTier: string } | null;
  };
  requestedBy: { fullName: string; email: string };
}

export default function Approvals() {
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<ApprovalRequest[]>({
    queryKey: ["approvals/pending"],
    queryFn: () => apiClient.get("/approvals/pending").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const decide = useMutation({
    mutationFn: ({
      id,
      decision,
      comments,
    }: {
      id: string;
      decision: string;
      comments?: string;
    }) => apiClient.post(`/approvals/${id}/decide`, { decision, comments }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals/pending"] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-500 mt-1">
          {requests.length} email{requests.length !== 1 ? "s" : ""} awaiting your review
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <ShieldCheck className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700">All clear — no pending approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{req.email.subject}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {req.email.product.name} · Requested by {req.requestedBy.fullName}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {req.email.riskAssessment && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        req.email.riskAssessment.riskTier === "high"
                          ? "bg-red-100 text-red-700"
                          : req.email.riskAssessment.riskTier === "medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      Risk {req.email.riskAssessment.riskScore}/100
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    Expires {new Date(req.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => decide.mutate({ id: req.id, decision: "approved" })}
                  disabled={decide.isPending}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => decide.mutate({ id: req.id, decision: "rejected" })}
                  disabled={decide.isPending}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <ShieldX className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() =>
                    decide.mutate({ id: req.id, decision: "requested_changes", comments: "Please review before sending." })
                  }
                  disabled={decide.isPending}
                  className="flex items-center gap-1.5 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Request Changes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
