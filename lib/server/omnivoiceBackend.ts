import { BackendError } from "@/lib/server/backendErrors";

const DEFAULT_OMNIVOICE_BASE_URL = "https://api.omnivoice.ai";
const DEFAULT_OMNIVOICE_VERSION = "v4";
const TOKEN_EXPIRY_SKEW_SECONDS = 60;

type OmnivoiceTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
};

let cachedToken: { accessToken: string; expiresAt: number } | undefined;

function getConfiguredBaseUrl() {
  const raw = process.env.OMNIVOICE_API_BASE_URL?.trim() || DEFAULT_OMNIVOICE_BASE_URL;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") throw new Error("OmniVoice requires HTTPS");
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new BackendError("OMNIVOICE_API_BASE_URL must be a valid HTTPS URL", 500);
  }
}

function getConfiguredVersion() {
  return (process.env.OMNIVOICE_API_VERSION?.trim() || DEFAULT_OMNIVOICE_VERSION).replace(/^\/+|\/+$/g, "");
}

function getOmnivoiceApiKey() {
  const apiKey = process.env.OMNIVOICE_API_KEY?.trim();
  if (!apiKey) throw new BackendError("OMNIVOICE_API_KEY is not configured", 500);
  return apiKey;
}

function getOmnivoiceSecretKey() {
  const secretKey = process.env.OMNIVOICE_SECRET_KEY?.trim();
  if (!secretKey) throw new BackendError("OMNIVOICE_SECRET_KEY is required for authenticated OmniVoice methods", 500);
  return secretKey;
}

export function buildOmnivoiceApiUrl(path: string) {
  const normalizedPath = path.replace(/^\/+/, "");
  return `${getConfiguredBaseUrl()}/${getConfiguredVersion()}/api/${normalizedPath}`;
}

export function getOmnivoiceRequestHeaders(authToken?: string) {
  return {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    "x-api-key": getOmnivoiceApiKey()
  };
}

async function responseMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text();
  if (typeof body === "string" && body.trim()) return body;
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    return String(record.message ?? record.error ?? record.error_description ?? `OmniVoice request failed with ${response.status}`);
  }
  return `OmniVoice request failed with ${response.status}`;
}

async function omnivoiceFetch(path: string, init: RequestInit = {}, authToken?: string) {
  const response = await fetch(buildOmnivoiceApiUrl(path), {
    ...init,
    headers: {
      accept: "application/json",
      ...getOmnivoiceRequestHeaders(authToken),
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new BackendError(await responseMessage(response), response.status >= 500 ? 502 : response.status);
  }

  return response;
}

export async function pingOmnivoice() {
  const response = await omnivoiceFetch("ping", { method: "GET" });
  return (await response.json()) as Record<string, unknown>;
}

export async function getOmnivoiceAuthToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.accessToken;

  const apiKey = getOmnivoiceApiKey();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: apiKey,
    client_secret: getOmnivoiceSecretKey()
  });

  const response = await fetch(buildOmnivoiceApiUrl("auth/token"), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-api-key": apiKey
    },
    body
  });

  if (!response.ok) {
    throw new BackendError(await responseMessage(response), response.status >= 500 ? 502 : response.status);
  }

  const raw = (await response.json()) as OmnivoiceTokenResponse;
  if (!raw.access_token) throw new BackendError("OmniVoice auth response did not include access_token", 502);

  const expiresInSeconds = Math.max((raw.expires_in ?? 0) - TOKEN_EXPIRY_SKEW_SECONDS, 0);
  cachedToken = {
    accessToken: raw.access_token,
    expiresAt: now + expiresInSeconds * 1000
  };

  return raw.access_token;
}

export async function getOmnivoiceProfileStatus() {
  const authToken = await getOmnivoiceAuthToken();
  const response = await omnivoiceFetch("profile/status", { method: "GET" }, authToken);
  return (await response.json()) as Record<string, unknown>;
}
