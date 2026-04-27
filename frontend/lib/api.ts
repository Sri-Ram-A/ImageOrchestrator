import type { ApiErrorShape, AuthTokens } from "@/types/account";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

// ── Token helpers ──────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
    return typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
}

export function getRefreshToken(): string | null {
    return typeof window !== "undefined"
        ? localStorage.getItem("refresh_token")
        : null;
}

export function setTokens(access: string, refresh: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
}

export function clearTokens(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
}

// ── Low-level response handling ───────────────────────────────────────────────

async function parseResponse<T>(res: Response): Promise<T> {
    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    if (res.ok) {
        return (isJson ? await res.json() : (await res.text())) as T;
    }

    let errorBody: unknown = null;
    if (isJson) {
        errorBody = await res.json();
    } else {
        errorBody = await res.text();
    }

    const error: ApiErrorShape =
        typeof errorBody === "object" && errorBody !== null
            ? (errorBody as ApiErrorShape)
            : { detail: String(errorBody) };

    const message =
        error.detail ||
        error.message ||
        (typeof errorBody === "string" ? errorBody : "Request failed");

    throw new Error(message);
}

// ── Refresh logic ─────────────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
    const refresh = getRefreshToken();
    if (!refresh) return null;

    const res = await fetch(`${BASE}/auth/refresh/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
        clearTokens();
        return null;
    }

    const data = (await res.json()) as Partial<AuthTokens>;
    if (!data.access) {
        clearTokens();
        return null;
    }

    // SimpleJWT refresh endpoint usually returns only a new access token.
    // Keep the same refresh token unless your backend rotates refresh tokens.
    localStorage.setItem("access_token", data.access);

    return data.access;
}

// ── Universal request function ────────────────────────────────────────────────

export async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
    retryOnAuthFailure = true
): Promise<T> {
    const url = `${BASE}/${path.replace(/^\/+/, "")}`;
    const access = getAccessToken();

    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    if (access) {
        headers.set("Authorization", `Bearer ${access}`);
    }

    const res = await fetch(url, {
        ...options,
        headers,
    });

    if (res.status !== 401 || !retryOnAuthFailure) {
        return parseResponse<T>(res);
    }

    const newAccess = await refreshAccessToken();
    if (!newAccess) {
        throw new Error("Session expired. Please log in again.");
    }

    const retryHeaders = new Headers(options.headers || {});
    if (!retryHeaders.has("Content-Type") && !(options.body instanceof FormData)) {
        retryHeaders.set("Content-Type", "application/json");
    }
    retryHeaders.set("Authorization", `Bearer ${newAccess}`);

    const retryRes = await fetch(url, {
        ...options,
        headers: retryHeaders,
    });

    return parseResponse<T>(retryRes);
}

// ── Convenience helpers for auth ──────────────────────────────────────────────

export async function apiPost<T, B = unknown>(path: string, body: B): Promise<T> {
    return apiRequest<T>(path, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function apiGet<T>(path: string): Promise<T> {
    return apiRequest<T>(path, { method: "GET" });
}

export async function login(username: string, password: string) {
    return apiPost<{ access: string; refresh: string }, { username: string; password: string }>(
        "auth/login/",
        { username, password }
    );
}

export async function register<T>(
    payload: {
        username: string;
        email: string;
        password: string;
        password_confirm: string;
    }
): Promise<T> {
    return apiPost<T, typeof payload>("auth/register/", payload);
}

export async function getMe<T>() {
    return apiGet<T>("auth/me/");
}