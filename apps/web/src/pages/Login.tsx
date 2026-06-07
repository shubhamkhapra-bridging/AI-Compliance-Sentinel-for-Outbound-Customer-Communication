import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "../api/client";
import { useAuthStore } from "../hooks/useAuthStore";
import { Mail, Lock, Loader2, Zap } from "lucide-react";

const DEMO_USERS = [
  { label: "Admin",   email: "admin@bridgingtech.com",   password: "Admin@123456",   role: "admin" },
  { label: "Manager", email: "manager@bridgingtech.com", password: "Manager@123456", role: "manager" },
  { label: "Sender",  email: "sender@bridgingtech.com",  password: "Sender@123456",  role: "sender" },
];

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Min 8 characters"),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await apiClient.post("/auth/login", data);
      login(res.data.token, res.data.user);
    } catch {
      setError("root", { message: "Invalid email or password — or API is offline. Use Demo Login below." });
    }
  };

  const demoLogin = async (demo: typeof DEMO_USERS[0]) => {
    try {
      const res = await apiClient.post("/auth/login", {
        email: demo.email,
        password: demo.password,
      });
      login(res.data.token, res.data.user);
    } catch {
      setError("root", { message: `Demo login failed — ensure the API is running and the DB is seeded.` });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">AI Compliance Sentinel</h1>
          <p className="text-gray-400 mt-1">BridgingTech Email Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@bridgingtech.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-600">{errors.root.message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>

          {/* Demo Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">
                or demo access (no backend needed)
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {DEMO_USERS.map((d) => (
                <button
                  key={d.role}
                  onClick={() => demoLogin(d)}
                  className="flex flex-col items-center gap-1 py-2.5 px-2 border border-gray-200 rounded-lg hover:border-brand-400 hover:bg-brand-50 transition-colors group"
                >
                  <Zap className="w-3.5 h-3.5 text-brand-500 group-hover:text-brand-600" />
                  <span className="text-xs font-medium text-gray-700">{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
