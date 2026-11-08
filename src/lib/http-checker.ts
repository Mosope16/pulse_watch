import { validateUrlForSSRF } from "./ssrf";

export interface CheckExecutionOptions {
  url: string;
  method: "GET" | "POST" | "HEAD";
  timeoutMs: number;
  expectedStatus: number;
  expectedText?: string | null;
  headers?: Record<string, string> | null;
  body?: string | null;
  degradedThresholdMs?: number;
}

export interface CheckExecutionResult {
  isSuccess: boolean;
  isDegraded: boolean;
  statusCode?: number;
  responseTime: number; // in milliseconds
  duration: number; // total roundtrip duration in ms
  errorMessage?: string;
  errorType?: string;
  responseHeaders?: Record<string, string>;
  responsePreview?: string;
}

const MAX_REDIRECTS = 5;

/**
 * Executes a monitored HTTP check safely with SSRF protection,
 * redirect validation, timing instrumentation, and body/status verification.
 */
export async function executeHttpCheck(
  options: CheckExecutionOptions
): Promise<CheckExecutionResult> {
  const {
    url,
    method = "GET",
    timeoutMs = 10000,
    expectedStatus = 200,
    expectedText,
    headers,
    body,
    degradedThresholdMs = 2000,
  } = options;

  let currentUrl = url;
  let redirectCount = 0;
  const startTime = Date.now();

  try {
    while (redirectCount <= MAX_REDIRECTS) {
      // 1. SSRF validation on current URL before any network request
      const ssrfResult = await validateUrlForSSRF(currentUrl);
      if (!ssrfResult.isValid) {
        const duration = Date.now() - startTime;
        return {
          isSuccess: false,
          isDegraded: false,
          responseTime: duration,
          duration,
          errorMessage: ssrfResult.error || "Blocked by SSRF protection policy",
          errorType: "SSRF_BLOCKED",
        };
      }

      // 2. Prepare request with AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      const reqHeaders: Record<string, string> = {
        "User-Agent": "PulseWatch-UptimeBot/1.0 (+https://pulsewatch.dev/bot)",
        Accept: "*/*",
        ...(headers || {}),
      };

      const requestInit: RequestInit = {
        method,
        headers: reqHeaders,
        signal: controller.signal,
        redirect: "manual", // ALWAYS manual to catch redirects and prevent SSRF bypass
      };

      if (method === "POST" && body) {
        requestInit.body = body;
        if (!reqHeaders["Content-Type"]) {
          reqHeaders["Content-Type"] = "application/json";
        }
      }

      const requestStartTime = performance.now();
      let response: Response;

      try {
        response = await fetch(currentUrl, requestInit);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        const isTimeout =
          fetchErr.name === "AbortError" || fetchErr.message?.includes("aborted");

        return {
          isSuccess: false,
          isDegraded: false,
          responseTime: duration,
          duration,
          errorMessage: isTimeout
            ? `Request timed out after ${timeoutMs}ms`
            : `Network error: ${fetchErr.message || "Failed to fetch"}`,
          errorType: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
        };
      }

      clearTimeout(timeoutId);
      const requestEndTime = performance.now();
      const responseTime = Math.round(requestEndTime - requestStartTime);

      // 3. Handle redirects (301, 302, 303, 307, 308)
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get("location")
      ) {
        const locationHeader = response.headers.get("location")!;
        const nextUrl = new URL(locationHeader, currentUrl).toString();

        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          const duration = Date.now() - startTime;
          return {
            isSuccess: false,
            isDegraded: false,
            statusCode: response.status,
            responseTime,
            duration,
            errorMessage: `Exceeded maximum redirect limit (${MAX_REDIRECTS})`,
            errorType: "TOO_MANY_REDIRECTS",
          };
        }

        currentUrl = nextUrl;
        continue; // Follow redirect safely after next iteration checks SSRF
      }

      // 4. Capture headers
      const resHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });

      // 5. Read response body (if expectedText check is specified, or for preview)
      let textBody = "";
      if (method !== "HEAD") {
        try {
          const buffer = await response.arrayBuffer();
          // Support reading up to 512KB to avoid missing body content in full pages
          const previewBuffer = buffer.slice(0, 524288);
          const decoder = new TextDecoder("utf-8");
          textBody = decoder.decode(previewBuffer);
        } catch {
          // Ignore body read errors
        }
      }

      const totalDuration = Date.now() - startTime;

      // 6. Evaluate Health Criteria
      // Status code check
      if (response.status !== expectedStatus) {
        return {
          isSuccess: false,
          isDegraded: false,
          statusCode: response.status,
          responseTime,
          duration: totalDuration,
          errorMessage: `Expected HTTP ${expectedStatus}, received HTTP ${response.status}`,
          errorType: "STATUS_MISMATCH",
          responseHeaders: resHeaders,
          responsePreview: textBody.slice(0, 500),
        };
      }

      // Expected body text check (supports exact and case-insensitive matching)
      if (expectedText && expectedText.trim() !== "") {
        const needle = expectedText.trim();
        const matches =
          textBody.includes(needle) ||
          textBody.toLowerCase().includes(needle.toLowerCase());

        if (!matches) {
          return {
            isSuccess: false,
            isDegraded: false,
            statusCode: response.status,
            responseTime,
            duration: totalDuration,
            errorMessage: `Response body does not contain expected text "${expectedText}"`,
            errorType: "BODY_MISMATCH",
            responseHeaders: resHeaders,
            responsePreview: textBody.slice(0, 500),
          };
        }
      }

      // Degradation check: responds with expected status, but latency exceeds threshold
      const isDegraded = responseTime >= degradedThresholdMs;

      return {
        isSuccess: true,
        isDegraded,
        statusCode: response.status,
        responseTime,
        duration: totalDuration,
        errorMessage: isDegraded
          ? `Slow response: ${responseTime}ms exceeds degraded threshold of ${degradedThresholdMs}ms`
          : undefined,
        errorType: isDegraded ? "DEGRADED_LATENCY" : undefined,
        responseHeaders: resHeaders,
        responsePreview: textBody.slice(0, 500),
      };
    }

    return {
      isSuccess: false,
      isDegraded: false,
      responseTime: 0,
      duration: Date.now() - startTime,
      errorMessage: "Redirect resolution failed",
      errorType: "REDIRECT_ERROR",
    };
  } catch (err: any) {
    const totalDuration = Date.now() - startTime;
    return {
      isSuccess: false,
      isDegraded: false,
      responseTime: totalDuration,
      duration: totalDuration,
      errorMessage: err.message || "Unknown error during check execution",
      errorType: "UNEXPECTED_ERROR",
    };
  }
}
