import crypto from "crypto";
import { storage } from "./storage";

// Xero OAuth2 PKCE Configuration
const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";
const XERO_SCOPES = process.env.XERO_SCOPES || "openid profile email offline_access accounting.contacts accounting.transactions";

function getClientId(): string {
  const id = process.env.XERO_CLIENT_ID;
  if (!id) throw new Error("XERO_CLIENT_ID environment variable is not set");
  return id;
}

function getRedirectUri(): string {
  const uri = process.env.XERO_REDIRECT_URI;
  if (!uri) throw new Error("XERO_REDIRECT_URI environment variable is not set");
  return uri;
}

// PKCE helpers
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

/** Build the Xero authorization URL and return it along with the code verifier to store in session */
export function buildAuthUrl(): { url: string; codeVerifier: string; state: string } {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: XERO_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return {
    url: `${XERO_AUTH_URL}?${params.toString()}`,
    codeVerifier,
    state,
  };
}

/** Exchange the authorization code for tokens using PKCE */
export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getClientId(),
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: codeVerifier,
  });

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Xero token exchange failed:", res.status, errText);
    throw new Error(`Xero token exchange failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number, // seconds (typically 1800 = 30 min)
  };
}

/** Fetch the list of connected Xero tenants (organisations) */
export async function fetchTenants(accessToken: string) {
  const res = await fetch(XERO_CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Xero fetch tenants failed:", res.status, errText);
    throw new Error(`Failed to fetch Xero tenants: ${res.status}`);
  }

  const connections = await res.json();
  // Return first tenant (most apps connect to a single org)
  return connections.map((c: any) => ({
    tenantId: c.tenantId as string,
    tenantName: (c.tenantName || "Unknown Organisation") as string,
  }));
}

/** Refresh an expired access token */
export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: getClientId(),
    refresh_token: refreshToken,
  });

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Xero token refresh failed:", res.status, errText);
    throw new Error(`Xero token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

/**
 * Get a valid access token for a user, auto-refreshing if expired.
 * Returns null if user has no Xero connection.
 */
export async function getValidToken(userId: string): Promise<{ accessToken: string; tenantId: string } | null> {
  const token = await storage.getXeroToken(userId);
  if (!token) return null;

  // Check if token is expired (with 2 min buffer)
  const now = new Date();
  const bufferMs = 2 * 60 * 1000;
  if (token.expiresAt.getTime() - bufferMs > now.getTime()) {
    // Token is still valid
    return { accessToken: token.accessToken, tenantId: token.tenantId };
  }

  // Token expired — refresh it
  try {
    const refreshed = await refreshAccessToken(token.refreshToken);
    const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);

    await storage.upsertXeroToken(userId, {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt,
      tenantId: token.tenantId,
      tenantName: token.tenantName,
    });

    return { accessToken: refreshed.accessToken, tenantId: token.tenantId };
  } catch (err) {
    console.error("Failed to refresh Xero token for user", userId, err);
    // Token refresh failed (possibly revoked) — delete the connection
    await storage.deleteXeroToken(userId);
    return null;
  }
}
