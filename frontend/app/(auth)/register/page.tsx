"use client";

import { useState } from "react";
import { motion } from "motion/react"
import { useRouter } from "next/navigation";
import { register, setTokens } from "@/lib/api";
import type { RegisterResponse } from "@/types/account";

export default function RegisterPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const data = await register<RegisterResponse>({
                username,
                email,
                password,
                password_confirm: passwordConfirm,
            });

            setTokens(data.access, data.refresh);
            router.push("/view");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
            >
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-zinc-900">Create account</h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        Register to get started.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-900"
                            placeholder="your_username"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-900"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-900"
                            placeholder="At least 8 characters"
                            minLength={8}
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Confirm password
                        </label>
                        <input
                            type="password"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-900"
                            placeholder="Repeat password"
                            minLength={8}
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
                        {loading ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="mt-6 text-sm text-zinc-600">
                    Already have an account?{" "}
                    <a href="/login" className="font-medium text-zinc-900 underline">
                        Sign in
                    </a>
                </p>
            </motion.div>
        </div>
    );
}