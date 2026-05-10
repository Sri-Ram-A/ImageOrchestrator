// frontend/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type BackendError = {
    message?: string;
    error?: string;
    detail?: string;
};

async function handleErrorResponse(res: Response): Promise<never> {
    let data: BackendError = {};
    try {
        data = await res.json();
    } catch { }
    throw {
        status: res.status,
        message: data.message ?? data.error ?? data.detail ?? "Request failed",
    };
}

async function refreshAccessToken(): Promise<string> {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) throw new Error("No refresh token");

    const res = await fetch(`${API_URL}/api/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
        localStorage.clear();
        throw new Error("Session expired");
    }

    const data = await res.json();
    localStorage.setItem("access", data.access);
    return data.access;
}

export async function REQUEST<T = unknown>(
    method: HttpMethod,
    url: string,
    body?: unknown,
    options?: { isMultipart?: boolean }
): Promise<T> {
    // 1. Instantiate headers 
    const headers: Record<string, string> = {};
    // 2. Change Content-Type if Images are present
    if (!options?.isMultipart) {
        headers["Content-Type"] = "application/json";
    }
    // 3. Get Access token to acces backend
    const access = localStorage.getItem("access");
    if (access) {
        headers["Authorization"] = `Bearer ${access}`;
    }
    // 4. Now Fetch the result from backend
    let res = await fetch(`${API_URL}${url}`, {
        method,
        headers,
        body: options?.isMultipart
            ? (body as BodyInit)
            : body
                ? JSON.stringify(body)
                : null,
    });

    // If no authorized then get a new refresh and acess token
    if (res.status === 401) {
        try {
            await refreshAccessToken();
            const newAccess = localStorage.getItem("access");
            if (newAccess) {
                headers["Authorization"] = `Bearer ${newAccess}`;
            }
            res = await fetch(`${API_URL}${url}`, {
                method,
                headers,
                body: options?.isMultipart
                    ? (body as BodyInit)
                    : body
                        ? JSON.stringify(body)
                        : null,
            });
        } catch {
            throw {
                message: "Session expired. Please login again.",
            };
        }
    }

    if (!res.ok) {
        await handleErrorResponse(res);
    }

    return (await res.json()) as T;
}

// Token helpers 
export function setTokens(access: string, refresh: string): void {
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
}

export function clearTokens(): void {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
}

export function getAccessToken(): string | null {
    return typeof window !== "undefined" ? localStorage.getItem("access") : null;
}
