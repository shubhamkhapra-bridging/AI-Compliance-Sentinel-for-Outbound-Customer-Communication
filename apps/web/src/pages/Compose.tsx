import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { Send, Sparkles, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";

interface Product { id: string; name: string; slug: string; }
interface Draft { subject: string; bodyHtml: string; bodyText: string; }

export default function Compose() {
  const [productId, setProductId] = useState("");
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [compliance, setCompliance] = useState<any>(null);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => apiClient.get("/products").then((r) => r.data),
  });

  const startConversation = useMutation({
    mutationFn: () =>
      apiClient.post("/conversations", { productId, initialMessage: message }),
    onSuccess: (res) => {
      setConversationId(res.data.id);
      // Poll for draft — in production use WebSocket/SSE
      pollForDraft(res.data.id);
    },
  });

  const pollForDraft = async (id: string) => {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const res = await apiClient.get(`/conversations/${id}`);
      if (res.data.drafts?.[0]) {
        setDraft(res.data.drafts[0]);
        return;
      }
    }
  };

  const runCompliance = useMutation({
    mutationFn: () =>
      apiClient.post("/emails/compliance-preview", {
        subject: draft?.subject,
        bodyHtml: draft?.bodyHtml,
        productId,
      }),
    onSuccess: (res) => setCompliance(res.data),
  });

  const isGenerating = startConversation.isPending || (conversationId && !draft);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compose Email</h1>
        <p className="text-gray-500 mt-1">Describe what you want to send — AI generates a compliant draft</p>
      </div>

      {/* Step 1: Intent */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          1. Describe your email
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">What should the email say?</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="e.g. Send a payment reminder to a customer who has an overdue balance of $450 on their Denefits plan. Keep it professional and include a CTA to pay online."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        <button
          onClick={() => startConversation.mutate()}
          disabled={!productId || !message.trim() || !!isGenerating}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate Draft</>
          )}
        </button>
      </div>

      {/* Step 2: Draft */}
      {draft && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Send className="w-4 h-4 text-green-600" />
            2. Review Draft
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea
              value={draft.bodyText ?? draft.bodyHtml}
              onChange={(e) => setDraft({ ...draft, bodyText: e.target.value })}
              rows={10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono"
            />
          </div>

          <button
            onClick={() => runCompliance.mutate()}
            disabled={runCompliance.isPending}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {runCompliance.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
            ) : (
              <><ShieldCheck className="w-4 h-4" /> Run Compliance Check</>
            )}
          </button>
        </div>
      )}

      {/* Step 3: Compliance result */}
      {compliance && (
        <div className={`rounded-xl border p-6 ${compliance.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            {compliance.passed ? (
              <ShieldCheck className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <h2 className="font-semibold">
              {compliance.passed ? "Compliance Passed" : "Compliance Issues Found"}
            </h2>
            <span className="ml-auto text-sm font-medium">
              Risk Score: {compliance.riskScore}/100
            </span>
          </div>

          {compliance.violations?.length > 0 && (
            <ul className="space-y-2 mt-3">
              {compliance.violations.map((v: any, i: number) => (
                <li key={i} className="text-sm bg-white rounded-lg p-3 border border-red-100">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                    v.severity === "high" ? "bg-red-100 text-red-700" :
                    v.severity === "medium" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{v.severity}</span>
                  <strong>{v.rule}:</strong> {v.description}
                  {v.suggestion && <p className="mt-1 text-gray-500 text-xs">Suggestion: {v.suggestion}</p>}
                </li>
              ))}
            </ul>
          )}

          {compliance.passed && (
            <button className="mt-4 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              <Send className="w-4 h-4" />
              Send Email
            </button>
          )}
        </div>
      )}
    </div>
  );
}
