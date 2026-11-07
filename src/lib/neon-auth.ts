export async function verifyNeonAuthStatus(): Promise<{
  status: "connected" | "unavailable";
  baseUrl: string;
  jwksUrl: string;
  keysCount?: number;
  error?: string;
}> {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const jwksUrl = process.env.NEON_AUTH_JWKS_URL;

  if (!baseUrl || !jwksUrl) {
    return {
      status: "unavailable",
      baseUrl: baseUrl || "",
      jwksUrl: jwksUrl || "",
      error: "Neon Auth environment variables missing.",
    };
  }

  try {
    const res = await fetch(jwksUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        status: "connected",
        baseUrl,
        jwksUrl,
        keysCount: data.keys?.length ?? 0,
      };
    } else {
      return {
        status: "unavailable",
        baseUrl,
        jwksUrl,
        error: `JWKS returned status ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      status: "unavailable",
      baseUrl,
      jwksUrl,
      error: err.message,
    };
  }
}
