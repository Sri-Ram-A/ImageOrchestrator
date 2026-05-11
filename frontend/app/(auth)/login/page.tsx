"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { REQUEST, setTokens } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


type AuthTokens = { access: string; refresh: string };

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await REQUEST<AuthTokens>("POST", "/api/auth/login/", { username, password });
            setTokens(data.access, data.refresh);
            router.push("/gallery");
        } catch (err: unknown) {
            const e = err as Record<string, string>;
            setError(e.message ?? e.error ?? e.detail ?? "Login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[url('/bg-login.jpg')] bg-cover bg-center px-4">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white/80 p-8 shadow-sm"
            >
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        Enter your credentials to continue.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label className="mb-1 block text-sm font-medium text-zinc-700">
                            Username
                        </Label>
                        <Input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-xl border border-zinc-300 text-black px-4 py-3 outline-none transition focus:border-zinc-900"
                            placeholder="your_username"
                            required
                        />
                    </div>

                    <div>
                        <Label className="mb-1 block text-sm font-medium text-zinc-700">
                            Password
                        </Label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-zinc-300 text-black px-4 py-3 outline-none transition focus:border-zinc-900"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-zinc-900 px-4 py-3 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p className="mt-6 text-sm text-zinc-600">
                    No account yet?{" "}
                    <a href="/register" className="font-medium text-zinc-900 underline">
                        Create one
                    </a>
                </p>
            </motion.div>
        </div>
    );
}