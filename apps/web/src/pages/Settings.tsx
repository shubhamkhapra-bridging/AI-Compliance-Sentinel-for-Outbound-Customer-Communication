import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { KeyRound, Loader2, Plus, Trash2, Copy, Check, ShieldCheck } from "lucide-react";

interface TenantSettings {
  id: string;
  name: string;
  llmProvider: string | null;
  llmModel: string | null;
  llmKeyConfigured: boolean;
  googleChatWebhookUrl: string | null;
}

interface ApiKeyRow {
  id: string;
  keyPrefix: string;
  name: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export default function Settings() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<TenantSettings>({
    queryKey: ["tenant-settings"],
    queryFn: () => apiClient.get("/tenants/settings").then((r) => r.data),
  });

  const { data: keysData } = useQuery<{ keys: ApiKeyRow[] }>({
    queryKey: ["tenant-keys"],
    queryFn: () => apiClient.get("/tenants/keys").then((r) => r.data),
  });

  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [webhook, setWebhook] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Hydrate local form state once settings load.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (settings && !hydrated) {
      setProvider(settings.llmProvider ?? "openai");
      setModel(settings.llmModel ?? "");
      setWebhook(settings.googleChatWebhookUrl ?? "");
      setHydrated(true);
    }
  }, [settings, hydrated]);

  const saveSettings = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiClient.put("/tenants/settings", body).then((r) => r.data),
    onSuccess: () => {
      setLlmApiKey("");
      qc.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
  });

  const createKey = useMutation({
    mutationFn: (name: string) =>
      apiClient.post("/tenants/keys", { name }).then((r) => r.data),
    onSuccess: (data: { apiKey: string }) => {
      setCreatedKey(data.apiKey);
      setNewKeyName("");
      qc.invalidateQueries({ queryKey: ["tenant-keys"] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tenants/keys/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-keys"] }),
  });

  const handleSave = () => {
    const body: Record<string, string> = { llmProvider: provider, llmModel: model, googleChatWebhookUrl: webhook };
    if (llmApiKey.trim()) body.llmApiKey = llmApiKey.trim();
    saveSettings.mutate(body);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Validation API: LLM provider, notifications, and API keys</p>
      </div>

      {/* LLM config */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-gray-900">LLM Provider</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model (optional)</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key {settings?.llmKeyConfigured && <span className="text-green-600 text-xs">(configured)</span>}
          </label>
          <input
            type="password"
            value={llmApiKey}
            onChange={(e) => setLlmApiKey(e.target.value)}
            placeholder={settings?.llmKeyConfigured ? "•••••••• (leave blank to keep)" : "sk-..."}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Stored encrypted. Never shown again after saving.</p>
        </div>
      </div>

      {/* Google Chat */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Google Chat Notifications</h2>
        <input
          value={webhook}
          onChange={(e) => setWebhook(e.target.value)}
          placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-400">Flagged emails post an issue summary + corrected version to this space.</p>
      </div>

      <button
        onClick={handleSave}
        disabled={saveSettings.isPending}
        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {saveSettings.isPending ? "Saving…" : "Save Settings"}
      </button>

      {/* API keys */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-gray-900">API Keys</h2>
        </div>

        {createdKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700 mb-2 font-medium">
              Copy your new key now — it won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border border-amber-200 rounded px-2 py-1.5 break-all">{createdKey}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(createdKey); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="p-1.5 text-amber-700 hover:bg-amber-100 rounded"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Production)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => createKey.mutate(newKeyName || "API key")}
            disabled={createKey.isPending}
            className="inline-flex items-center gap-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {(keysData?.keys ?? []).map((k) => (
            <div key={k.id} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{k.name}</p>
                <p className="text-xs text-gray-400">
                  <code>{k.keyPrefix}…</code> · last used {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "never"}
                  {k.revokedAt && <span className="text-red-500"> · revoked</span>}
                </p>
              </div>
              {!k.revokedAt && (
                <button
                  onClick={() => revokeKey.mutate(k.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600"
                  title="Revoke"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {(keysData?.keys ?? []).length === 0 && (
            <p className="text-sm text-gray-400 py-2">No API keys yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
