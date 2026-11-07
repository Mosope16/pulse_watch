import { describe, it, expect } from "vitest";
import { validateUrlForSSRF, isPrivateOrReservedIP } from "../src/lib/ssrf";

describe("SSRF Defense Module", () => {
  describe("IP Address Validation (isPrivateOrReservedIP)", () => {
    it("identifies IPv4 loopback addresses as dangerous", () => {
      expect(isPrivateOrReservedIP("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIP("127.0.0.2")).toBe(true);
      expect(isPrivateOrReservedIP("127.128.0.1")).toBe(true);
    });

    it("identifies IPv4 private RFC1918 ranges as dangerous", () => {
      expect(isPrivateOrReservedIP("10.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIP("10.254.254.1")).toBe(true);
      expect(isPrivateOrReservedIP("172.16.0.1")).toBe(true);
      expect(isPrivateOrReservedIP("172.31.255.255")).toBe(true);
      expect(isPrivateOrReservedIP("192.168.0.1")).toBe(true);
      expect(isPrivateOrReservedIP("192.168.100.50")).toBe(true);
    });

    it("identifies cloud metadata / link-local addresses as dangerous", () => {
      expect(isPrivateOrReservedIP("169.254.169.254")).toBe(true);
      expect(isPrivateOrReservedIP("169.254.169.253")).toBe(true);
      expect(isPrivateOrReservedIP("169.254.1.1")).toBe(true);
    });

    it("identifies IPv6 loopback and unique local as dangerous", () => {
      expect(isPrivateOrReservedIP("::1")).toBe(true);
      expect(isPrivateOrReservedIP("fc00::1")).toBe(true);
      expect(isPrivateOrReservedIP("fe80::1")).toBe(true);
    });

    it("allows valid public Internet IP addresses", () => {
      expect(isPrivateOrReservedIP("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIP("1.1.1.1")).toBe(false);
      expect(isPrivateOrReservedIP("104.26.10.12")).toBe(false);
    });
  });

  describe("URL Validation (validateUrlForSSRF)", () => {
    it("rejects non-HTTP protocols", async () => {
      const fileRes = await validateUrlForSSRF("file:///etc/passwd");
      expect(fileRes.isValid).toBe(false);
      expect(fileRes.error).toContain("Unsupported protocol");

      const ftpRes = await validateUrlForSSRF("ftp://attacker.com/payload");
      expect(ftpRes.isValid).toBe(false);

      const gopherRes = await validateUrlForSSRF("gopher://127.0.0.1:6379/_");
      expect(gopherRes.isValid).toBe(false);
    });

    it("blocks localhost and local domain names", async () => {
      const localhostRes = await validateUrlForSSRF("http://localhost:3000/api");
      expect(localhostRes.isValid).toBe(false);
      expect(localhostRes.error).toContain("blocked");

      const subLocalhost = await validateUrlForSSRF("http://admin.localhost:8080");
      expect(subLocalhost.isValid).toBe(false);

      const internalDomain = await validateUrlForSSRF("http://service.internal");
      expect(internalDomain.isValid).toBe(false);
    });

    it("blocks cloud metadata hostnames directly", async () => {
      const gcpRes = await validateUrlForSSRF("http://metadata.google.internal/computeMetadata/v1/");
      expect(gcpRes.isValid).toBe(false);

      const awsRes = await validateUrlForSSRF("http://169.254.169.254/latest/meta-data/");
      expect(awsRes.isValid).toBe(false);
    });

    it("rejects URLs containing embedded user credentials", async () => {
      const credsRes = await validateUrlForSSRF("http://admin:password@example.com");
      expect(credsRes.isValid).toBe(false);
      expect(credsRes.error).toContain("credentials");
    });

    it("allows legitimate public HTTPS URLs", async () => {
      const googleRes = await validateUrlForSSRF("https://www.google.com");
      expect(googleRes.isValid).toBe(true);
      expect(googleRes.resolvedIps?.length).toBeGreaterThan(0);
    });
  });
});
