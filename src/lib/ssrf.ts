import dns from "node:dns/promises";
import net from "node:net";
import ipaddr from "ipaddr.js";

export interface SSRFValidationResult {
  isValid: boolean;
  error?: string;
  resolvedIps?: string[];
}

// Disallowed hostnames and suffixes
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "instance-data",
  "metadata",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".corp",
  ".intranet",
];

/**
 * Checks if an IP address falls within private, loopback, link-local, or reserved ranges.
 */
export function isPrivateOrReservedIP(ipStr: string): boolean {
  try {
    const addr = ipaddr.process(ipStr);
    const range = addr.range();

    // ipaddr.js identifies ranges:
    // IPv4: "unicast", "unspecified", "broadcast", "multicast", "linkLocal", "loopback", "private", "carrierGradeNat", "reserved"
    // IPv6: "unicast", "unspecified", "linkLocal", "multicast", "loopback", "uniqueLocal", "ipv4Mapped", "rfc6145", "rfc6052", "6to4", "teredo", "reserved"
    const dangerousRanges = new Set([
      "unspecified",
      "broadcast",
      "multicast",
      "linkLocal",
      "loopback",
      "private",
      "carrierGradeNat",
      "reserved",
      "uniqueLocal",
    ]);

    if (dangerousRanges.has(range)) {
      return true;
    }

    // Additional check for AWS/GCP/Azure link-local metadata (169.254.169.254)
    if (ipStr === "169.254.169.254" || ipStr === "169.254.169.253") {
      return true;
    }

    return false;
  } catch {
    // If it cannot be parsed as a valid IP, treat as invalid/dangerous
    return true;
  }
}

/**
 * Validates a URL against SSRF vulnerabilities:
 * 1. Protocol must be http: or https:
 * 2. Hostname must not be localhost or internal domain
 * 3. Resolves DNS records and validates that NONE of the resolved IPs are in private/reserved ranges
 */
export async function validateUrlForSSRF(urlString: string): Promise<SSRFValidationResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }

  // 1. Check protocol
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      isValid: false,
      error: `Unsupported protocol "${parsedUrl.protocol}". Only http: and https: are permitted.`,
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 2. Reject credentials in URL
  if (parsedUrl.username || parsedUrl.password) {
    return {
      isValid: false,
      error: "URLs with embedded user credentials are not allowed.",
    };
  }

  // 3. Block localhost & internal domains
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return {
      isValid: false,
      error: `Access to internal host "${hostname}" is blocked.`,
    };
  }

  for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      return {
        isValid: false,
        error: `Access to internal domain suffix "${suffix}" is blocked.`,
      };
    }
  }

  // 4. If hostname is a raw IP literal, validate directly
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIP(hostname)) {
      return {
        isValid: false,
        error: `Direct connection to private/reserved IP "${hostname}" is blocked.`,
      };
    }
    return { isValid: true, resolvedIps: [hostname] };
  }

  // 5. Perform DNS lookup to inspect all resolved IPs (defend against DNS pinning to internal IP)
  try {
    const addresses = await dns.lookup(hostname, { all: true });

    if (!addresses || addresses.length === 0) {
      return {
        isValid: false,
        error: `Could not resolve hostname "${hostname}".`,
      };
    }

    const resolvedIps = addresses.map((a) => a.address);

    for (const addr of addresses) {
      if (isPrivateOrReservedIP(addr.address)) {
        return {
          isValid: false,
          error: `Hostname "${hostname}" resolved to private/reserved IP "${addr.address}". Connection blocked.`,
          resolvedIps,
        };
      }
    }

    return { isValid: true, resolvedIps };
  } catch (err: any) {
    return {
      isValid: false,
      error: `DNS resolution failed for "${hostname}": ${err.message || "Unknown error"}`,
    };
  }
}
