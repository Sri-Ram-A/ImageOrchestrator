"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { REQUEST, setTokens } from "@/lib/api";

type AuthResponse = { access: string; refresh: string; user?: unknown };

export default function RegisterPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [password_confirm, setpassword_confirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const data = await REQUEST<AuthResponse>("POST", "/api/auth/register/", {
                username,
                email,
                password,
                password_confirm,
            });

            setTokens(data.access, data.refresh);
            router.push("/login");
        } catch (err: unknown) {
            const e = err as Record<string, string>;
            setError(e.message ?? e.error ?? e.detail ?? "Registration failed");
        } finally {
            setLoading(false);
        }
    }

    const googleLogin = useGoogleLogin({
        flow: "implicit",
        onSuccess: async (tokenResponse) => {
            setError(null);
            setGoogleLoading(true);
            try {
                const data = await REQUEST<AuthResponse>("POST", "/api/auth/google_login/", {
                    token: tokenResponse.access_token,
                });
                setTokens(data.access, data.refresh);
                router.push("/gallery");
            } catch (err: unknown) {
                const e = err as Record<string, string>;
                setError(e.message ?? e.error ?? e.detail ?? "Google login failed");
            } finally {
                setGoogleLoading(false);
            }
        },
        onError: () => {
            setError("Google sign-in failed");
        },
    });

    return (
        <div className="min-h-screen flex items-center justify-center bg-[url('/bg-register.jpeg')] bg-cover bg-center px-4">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white/80 p-8 shadow-sm"
            >
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-zinc-900">Create account</h1>
                    <p className="mt-1 text-sm text-zinc-500">Register to get started.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-black">
                    <div>
                        <Label className="mb-1 block text-sm font-medium text-zinc-700">
                            Username
                        </Label>
                        <Input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-900"
                            placeholder="your_username"
                            required
                        />
                    </div>

                    <div>
                        <Label className="mb-1 block text-sm font-medium text-zinc-700">
                            Email
                        </Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-900"
                            placeholder="you@example.com"
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
                            className="w-full rounded border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-900"
                            placeholder="At least 8 characters"
                            minLength={8}
                            required
                        />
                    </div>

                    <div>
                        <Label className="mb-1 block text-sm font-medium text-zinc-700">
                            Confirm password
                        </Label>
                        <Input
                            type="password"
                            value={password_confirm}
                            onChange={(e) => setpassword_confirm(e.target.value)}
                            className="w-full rounded border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-900"
                            placeholder="Repeat password"
                            minLength={8}
                            required
                        />
                    </div>

                    {error && (
                        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded bg-secondary px-4 py-3 font-medium text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Creating account..." : "Create account"}
                    </Button>

                    <Button
                        type="button"
                        onClick={() => googleLogin()}
                        disabled={googleLoading || loading}
                        className="w-full rounded bg-blue-600/80 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {googleLoading ? "Signing in..." : "Sign in with Google"}
                    </Button>
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