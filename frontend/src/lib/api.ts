/**
 * The only place the frontend talks to the backend.
 *
 * There is no database access here and there never should be — every read
 * and write goes through FastAPI (docs/security.md §3).
 */

import type { ApiErrorBody, Envelope, PagedEnvelope } from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "iub_alumni_token";

/** Thrown for any non-2xx response, carrying the API's error envelope. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field: string | null;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.field = body.field ?? null;
  }
}

/* The token lives in memory; sessionStorage keeps a page refresh from
   signing the user out, and clears when the tab closes. */
let token: string | null = null;

export function getToken(): string | null {
  if (token === null) {
    try {
      token = sessionStorage.getItem(TOKEN_KEY);
    } catch {
      token = null;
    }
  }
  return token;
}

export function setToken(value: string | null): void {
  token = value;
  try {
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* Private browsing can refuse storage; the in-memory token still works. */
  }
}

/** Called when the API reports the session is no longer valid. */
let onUnauthenticated: (() => void) | null = null;
export function setUnauthenticatedHandler(fn: () => void): void {
  onUnauthenticated = fn;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function buildQuery(params: Query): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");

  const current = getToken();
  if (current) headers.set("Authorization", `Bearer ${current}`);

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, {
      code: "NETWORK",
      message: "Can't reach the server. Check your connection and try again.",
    });
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const body: ApiErrorBody = payload?.error ?? {
      code: "ERROR",
      message: "Something went wrong. Try again.",
    };
    // An expired or revoked token should return the user to sign-in rather
    // than leaving a half-loaded page behind.
    if (response.status === 401 && getToken()) {
      setToken(null);
      onUnauthenticated?.();
    }
    throw new ApiError(response.status, body);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: JSON.stringify(body ?? {}) }),
};

/** Unwraps `{ data: ... }` for endpoints that return a single object. */
export async function getData<T>(path: string): Promise<T> {
  const envelope = await api.get<Envelope<T>>(path);
  return envelope.data;
}

/** Keeps `meta` for endpoints that return a page of rows. */
export function getPage<T>(path: string): Promise<PagedEnvelope<T>> {
  return api.get<PagedEnvelope<T>>(path);
}
