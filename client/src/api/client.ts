// The one place that talks to the server. Every other file in api/ uses request() from here.

// Empty in development (the Vite proxy forwards /api to the server).
// In production, set VITE_API_URL to the deployed API address.
const BASE = import.meta.env.VITE_API_URL ?? "";

// An error that remembers the HTTP status code (e.g. 404), so pages can react to it.
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown; // a file is sent as it is; anything else is sent as JSON
}

export async function request<T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  const isJson = body !== undefined && !(body instanceof Blob);
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: "include", // send the admin login cookie
    headers: isJson ? { "Content-Type": "application/json" } : undefined,
    body: isJson ? JSON.stringify(body) : (body as Blob | undefined),
  });
  if (!res.ok) {
    const data: { error?: string } = await res.json().catch(() => ({}));
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  }
  // 204 No Content (after a delete) has no body to read.
  return (res.status === 204 ? undefined : res.json()) as Promise<T>;
}

// Uploads kept on the server itself have links like "/uploads/x.png"; Cloudinary links are complete.
export const mediaUrl = (url: string) => (url.startsWith("/") ? BASE + url : url);