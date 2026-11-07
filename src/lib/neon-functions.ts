export async function invokeHelloFunction(): Promise<{
  status: number;
  body: string;
  durationMs: number;
}> {
  const baseUrl = process.env.NEON_FUNCTION_HELLO_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEON_FUNCTION_HELLO_BASE_URL environment variable is not defined.");
  }

  const start = Date.now();
  const res = await fetch(baseUrl, {
    method: "GET",
    headers: {
      "User-Agent": "PulseWatch-Monitoring/1.0",
    },
    // Set 10-second timeout
    signal: AbortSignal.timeout(10000),
  });

  const body = await res.text();
  const durationMs = Date.now() - start;

  return {
    status: res.status,
    body,
    durationMs,
  };
}

export async function invokeNeonFunction(
  functionBaseUrl: string,
  path = "",
  options: RequestInit = {}
): Promise<{ status: number; data: any; durationMs: number }> {
  const url = new URL(path, functionBaseUrl).toString();
  const start = Date.now();

  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(10000),
  });

  const contentType = res.headers.get("content-type") || "";
  let data: any;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    data,
    durationMs: Date.now() - start,
  };
}
