import { ethers } from "ethers";

// Lightweight JCS normalization: stable key order, no whitespace differences.
// For strict RFC 8785 compliance, consider adding a dedicated dependency.
function jcsNormalizeJson(value: any): string {
  const stringify = (v: any): string => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stringify).join(',') + ']';
    const keys = Object.keys(v).sort();
    const entries = keys.map(k => JSON.stringify(k) + ':' + stringify(v[k]));
    return '{' + entries.join(',') + '}';
  };
  return stringify(value);
}

export type DataHashAlgorithm = 0 | 1; // 0=keccak256, 1=sha256 (reserved)

export async function computeDataHashFromDataUrl(
  dataUrl: string,
  algorithm: DataHashAlgorithm = 0,
  opts?: { timeoutMs?: number; maxBytes?: number }
): Promise<{ hash: `0x${string}`; jcsJson: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 15000);
  try {
    const res = await fetch(dataUrl, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error(`Invalid content-type: ${ct}`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const chunks: Uint8Array[] = [];
    let total = 0;
    const max = opts?.maxBytes ?? 2_000_000; // 2MB cap
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > max) throw new Error(`Response too large (> ${max} bytes)`);
      chunks.push(value);
    }
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { buf.set(c, offset); offset += c.byteLength; }
    const text = new TextDecoder().decode(buf);
    const parsed = JSON.parse(text);
    const jcsJson = jcsNormalizeJson(parsed);
    const hash = algorithm === 0
      ? (ethers.id(jcsJson) as `0x${string}`)
      : (ethers.hexlify(ethers.sha256(ethers.toUtf8Bytes(jcsJson))) as `0x${string}`); // placeholder path
    return { hash, jcsJson };
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyDataUrlHash(
  dataUrl: string,
  expectedHash: `0x${string}`,
  algorithm: DataHashAlgorithm = 0,
  opts?: { timeoutMs?: number; maxBytes?: number }
): Promise<{ ok: boolean; computedHash: `0x${string}`; jcsJson: string }> {
  const { hash, jcsJson } = await computeDataHashFromDataUrl(dataUrl, algorithm, opts);
  return { ok: hash.toLowerCase() === expectedHash.toLowerCase(), computedHash: hash, jcsJson };
}

export function canonicalizeForHash(obj: any): { jcsJson: string; hash: `0x${string}` } {
  const jcsJson = jcsNormalizeJson(obj);
  const hash = ethers.id(jcsJson) as `0x${string}`;
  return { jcsJson, hash };
}


