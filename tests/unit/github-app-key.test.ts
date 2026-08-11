import { describe, expect, it } from "vitest";

import { githubAppPrivateKeyBytes } from "@/lib/github-app-key";

const pem = (label: "PRIVATE KEY" | "RSA PRIVATE KEY", bytes: number[]) =>
  `-----BEGIN ${label}-----\n${btoa(String.fromCharCode(...bytes))}\n-----END ${label}-----`;

describe("GitHub App private keys", () => {
  it("keeps PKCS#8 keys unchanged", () => {
    const bytes = [0x30, 0x03, 0x02, 0x01, 0x00];
    expect([...new Uint8Array(githubAppPrivateKeyBytes(pem("PRIVATE KEY", bytes)))]).toEqual(bytes);
  });

  it("wraps GitHub's PKCS#1 RSA keys as PKCS#8", () => {
    const pkcs1 = [0x30, 0x03, 0x02, 0x01, 0x00];
    const normalized = [...new Uint8Array(githubAppPrivateKeyBytes(pem("RSA PRIVATE KEY", pkcs1)))];
    expect(normalized.slice(0, 5)).toEqual([0x30, 0x19, 0x02, 0x01, 0x00]);
    expect(normalized.slice(-pkcs1.length)).toEqual(pkcs1);
  });
});
