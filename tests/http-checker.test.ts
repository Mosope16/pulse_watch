import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { executeHttpCheck } from "../src/lib/http-checker";
import * as ssrfModule from "../src/lib/ssrf";

describe("HTTP Check Execution Engine", () => {
  let server: http.Server;
  let serverPort: number;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/status/404") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      } else if (req.url === "/json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Wake up to WonderWidgets" }));
      } else if (req.url === "/slow") {
        setTimeout(() => {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("Slow OK");
        }, 50);
      } else {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("blocks SSRF attack attempts before dispatching network request", async () => {
    const checkResult = await executeHttpCheck({
      url: "http://127.0.0.1:8080/admin",
      method: "GET",
      timeoutMs: 5000,
      expectedStatus: 200,
    });

    expect(checkResult.isSuccess).toBe(false);
    expect(checkResult.errorType).toBe("SSRF_BLOCKED");
    expect(checkResult.errorMessage).toContain("blocked");
  });

  it("handles status code mismatches correctly", async () => {
    // Spy to bypass SSRF check specifically for this mock test server URL
    const ssrfSpy = vi.spyOn(ssrfModule, "validateUrlForSSRF").mockResolvedValue({
      isValid: true,
      resolvedIps: ["127.0.0.1"],
    });

    const checkResult = await executeHttpCheck({
      url: `http://127.0.0.1:${serverPort}/status/404`,
      method: "GET",
      timeoutMs: 5000,
      expectedStatus: 200,
    });

    expect(checkResult.isSuccess).toBe(false);
    expect(checkResult.statusCode).toBe(404);
    expect(checkResult.errorType).toBe("STATUS_MISMATCH");
    expect(checkResult.errorMessage).toContain("Expected HTTP 200, received HTTP 404");

    ssrfSpy.mockRestore();
  });

  it("validates expected response body keyword assertions", async () => {
    const ssrfSpy = vi.spyOn(ssrfModule, "validateUrlForSSRF").mockResolvedValue({
      isValid: true,
      resolvedIps: ["127.0.0.1"],
    });

    const checkResult = await executeHttpCheck({
      url: `http://127.0.0.1:${serverPort}/json`,
      method: "GET",
      timeoutMs: 5000,
      expectedStatus: 200,
      expectedText: "Wake up to WonderWidgets",
    });

    expect(checkResult.isSuccess).toBe(true);
    expect(checkResult.statusCode).toBe(200);
    expect(checkResult.errorType).toBeUndefined();

    // Check with missing keyword
    const failingKeywordCheck = await executeHttpCheck({
      url: `http://127.0.0.1:${serverPort}/json`,
      method: "GET",
      timeoutMs: 5000,
      expectedStatus: 200,
      expectedText: "NON_EXISTENT_SUPER_SECRET_KEYWORD",
    });

    expect(failingKeywordCheck.isSuccess).toBe(false);
    expect(failingKeywordCheck.errorType).toBe("BODY_MISMATCH");

    ssrfSpy.mockRestore();
  });

  it("evaluates degraded latency thresholds", async () => {
    const ssrfSpy = vi.spyOn(ssrfModule, "validateUrlForSSRF").mockResolvedValue({
      isValid: true,
      resolvedIps: ["127.0.0.1"],
    });

    const checkResult = await executeHttpCheck({
      url: `http://127.0.0.1:${serverPort}/slow`,
      method: "GET",
      timeoutMs: 5000,
      expectedStatus: 200,
      degradedThresholdMs: 20, // 20ms threshold triggers degraded on 50ms delayed endpoint
    });

    expect(checkResult.isSuccess).toBe(true);
    expect(checkResult.isDegraded).toBe(true);
    expect(checkResult.errorType).toBe("DEGRADED_LATENCY");

    ssrfSpy.mockRestore();
  });
});
