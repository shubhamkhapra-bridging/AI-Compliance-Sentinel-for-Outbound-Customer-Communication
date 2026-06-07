import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import {
  Send, Sparkles, ShieldCheck, Loader2, AlertTriangle,
  Wrench, Globe, Database, CheckCircle2, Eye, X, Mail,
  Palette, Wand2, ImagePlus,
} from "lucide-react";

const STYLE_SUGGESTIONS = [
  "Match the branding of my website https://…",
  "Add my logo: https://…",
  "Make the header green",
  "Bigger body font",
  "Change the button to 'Pay Now'",
  "Remove the logo",
];

interface Product { id: string; name: string; slug: string; }

interface Draft {
  id: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

interface Violation {
  rule: string;
  severity: string;
  description: string;
  suggestion?: string;
}

export default function Compose() {
  const [productId, setProductId]       = useState("");
  const [message, setMessage]           = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft]               = useState<Draft | null>(null);
  const [compliance, setCompliance]     = useState<{
    passed: boolean; riskScore: number; violations: Violation[];
  } | null>(null);
  const [fixResult, setFixResult]       = useState<{
    changes: string[]; knowledgeSource: "live" | "cache" | "none";
  } | null>(null);

  // Preview / send modal
  const [previewOpen, setPreviewOpen]   = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendSuccess, setSendSuccess]   = useState(false);
  const [styleInstruction, setStyleInstruction] = useState("");
  const [styleChanges, setStyleChanges] = useState<string[]>([]);
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [styleImageName, setStyleImageName] = useState("");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => apiClient.get("/products").then((r) => r.data),
  });

  const startConversation = useMutation({
    mutationFn: () =>
      apiClient.post("/conversations", { productId, initialMessage: message }),
    onSuccess: (res) => {
      setConversationId(res.data.id);
      setDraft(null);
      setCompliance(null);
      setFixResult(null);
      setSendSuccess(false);
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
    onSuccess: (res) => {
      setCompliance(res.data);
      setFixResult(null);
    },
  });

  const fixDraft = useMutation({
    mutationFn: () =>
      apiClient.post("/emails/fix-draft", {
        subject: draft?.subject,
        bodyHtml: draft?.bodyHtml,
        bodyText: draft?.bodyText,
        violations: compliance?.violations ?? [],
        productId,
      }),
    onSuccess: (res) => {
      setDraft((prev) => prev ? {
        ...prev,
        subject: res.data.subject,
        bodyHtml: res.data.bodyHtml,
        bodyText: res.data.bodyText,
      } : null);
      setFixResult({ changes: res.data.changes ?? [], knowledgeSource: res.data.knowledgeSource ?? "none" });
      setCompliance(null);
    },
  });

  const restyle = useMutation({
    mutationFn: (vars: { instruction: string; imageBase64?: string }) =>
      apiClient.post("/emails/restyle", { draftId: draft?.id, ...vars }),
    onSuccess: (res) => {
      setDraft((prev) => prev ? {
        ...prev,
        bodyHtml: res.data.bodyHtml,
        bodyText: res.data.bodyText || prev.bodyText,
      } : null);
      setStyleChanges(res.data.changes ?? []);
      setStyleInstruction("");
      setStyleImage(null);
      setStyleImageName("");
    },
  });

  const sendEmail = useMutation({
    mutationFn: () =>
      apiClient.post("/emails/send", {
        draftId: draft?.id,
        recipientEmail,
      }),
    onSuccess: () => {
      setSendSuccess(true);
      setPreviewOpen(false);
    },
  });

  const submitRestyle = (instruction: string) => {
    if (restyle.isPending) return;
    if (!instruction.trim() && !styleImage) return;
    restyle.mutate({ instruction, imageBase64: styleImage ?? undefined });
  };

  const onPickStyleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setStyleImage(reader.result as string);
      setStyleImageName(file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // allow re-selecting the same file
  };

  const isGenerating = startConversation.isPending || (!!conversationId && !draft);

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
            placeholder="e.g. Send a payment reminder to a customer with an overdue balance of $450. Keep it professional and include a CTA to pay online."
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
      {draft && !sendSuccess && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Send className="w-4 h-4 text-green-600" />
              2. Review Draft
            </h2>
            {fixResult && <KnowledgeBadge source={fixResult.knowledgeSource} />}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body (plain text)</label>
            <textarea
              value={draft.bodyText ?? draft.bodyHtml}
              onChange={(e) => setDraft({ ...draft, bodyText: e.target.value })}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono"
            />
          </div>

          {/* Live branded HTML preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branded preview</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 relative">
              {restyle.isPending && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" /> Applying style…
                  </span>
                </div>
              )}
              <iframe
                srcDoc={draft.bodyHtml}
                title="Branded email preview"
                className="w-full"
                style={{ height: 420 }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>

          {/* Chat-driven style customization */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-purple-900 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Edit by chat — paste a website, a logo URL, or upload a screenshot
            </p>
            <div className="flex gap-2">
              <input
                value={styleInstruction}
                onChange={(e) => setStyleInstruction(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitRestyle(styleInstruction); }}
                placeholder="e.g. match my website https://…  ·  add my logo  ·  dark green header, bigger font"
                className="flex-1 border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <label
                title="Upload a screenshot to copy its colors"
                className="flex items-center gap-1.5 cursor-pointer border border-purple-200 bg-white text-purple-700 hover:bg-purple-100 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                <input type="file" accept="image/*" onChange={onPickStyleImage} className="hidden" />
              </label>
              <button
                onClick={() => submitRestyle(styleInstruction)}
                disabled={(!styleInstruction.trim() && !styleImage) || restyle.isPending}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Wand2 className="w-4 h-4" /> Apply
              </button>
            </div>

            {styleImage && (
              <div className="flex items-center gap-2 text-xs text-purple-700 bg-white border border-purple-200 rounded-lg px-3 py-1.5 w-fit">
                <ImagePlus className="w-3.5 h-3.5" />
                <span className="max-w-[200px] truncate">{styleImageName || "screenshot"}</span>
                <button
                  onClick={() => { setStyleImage(null); setStyleImageName(""); }}
                  className="text-purple-400 hover:text-purple-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {STYLE_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submitRestyle(s)}
                  disabled={restyle.isPending}
                  className="text-xs bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 disabled:opacity-50 px-2.5 py-1 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            {styleChanges.length > 0 && (
              <p className="text-xs text-purple-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {styleChanges.join("; ")}
              </p>
            )}
          </div>

          {fixResult && fixResult.changes.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Changes applied ({fixResult.changes.length})
              </p>
              <ul className="space-y-1">
                {fixResult.changes.map((c, i) => (
                  <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">•</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
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

            <button
              onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" /> Preview &amp; Send
            </button>
          </div>
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
              {compliance.violations.map((v, i) => (
                <li key={i} className="text-sm bg-white rounded-lg p-3 border border-red-100">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                    v.severity === "high"   ? "bg-red-100 text-red-700" :
                    v.severity === "medium" ? "bg-amber-100 text-amber-700" :
                                             "bg-gray-100 text-gray-700"
                  }`}>{v.severity}</span>
                  <strong>{v.rule}:</strong> {v.description}
                  {v.suggestion && (
                    <p className="mt-1 text-gray-500 text-xs">Suggestion: {v.suggestion}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-3 mt-4 flex-wrap">
            {!compliance.passed && compliance.violations?.length > 0 && (
              <button
                onClick={() => fixDraft.mutate()}
                disabled={fixDraft.isPending}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                {fixDraft.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Fetching knowledge &amp; fixing…</>
                ) : (
                  <><Wrench className="w-4 h-4" /> Auto-Fix Issues</>
                )}
              </button>
            )}

            {compliance.passed && (
              <button
                onClick={() => setPreviewOpen(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" /> Preview &amp; Send
              </button>
            )}
          </div>
        </div>
      )}

      {/* Send success */}
      {sendSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Email sent successfully!</p>
            <p className="text-sm text-green-600 mt-0.5">
              Your email has been dispatched. View it in{" "}
              <a href="/emails" className="underline font-medium">Email History</a>.
            </p>
          </div>
        </div>
      )}

      {/* HTML Preview + Send Modal */}
      {previewOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-600" />
                Email Preview
              </h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subject bar */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">Subject</p>
              <p className="text-sm font-medium text-gray-900">{draft.subject}</p>
            </div>

            {/* Rendered HTML preview */}
            <div className="flex-1 overflow-hidden border-b border-gray-200">
              <iframe
                srcDoc={draft.bodyHtml}
                title="Email HTML preview"
                className="w-full h-full"
                style={{ minHeight: 320 }}
                sandbox="allow-same-origin"
              />
            </div>

            {/* Recipient + send */}
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient email address
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {sendEmail.isError && (
                <p className="text-sm text-red-600">
                  Send failed — check the console or try again.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendEmail.mutate()}
                  disabled={!recipientEmail.trim() || sendEmail.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {sendEmail.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send Email</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KnowledgeBadge({ source }: { source: "live" | "cache" | "none" }) {
  if (source === "live") return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
      <Globe className="w-3 h-3" /> Live website knowledge applied
    </span>
  );
  if (source === "cache") return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
      <Database className="w-3 h-3" /> Cached website knowledge applied
    </span>
  );
  return null;
}
