/**
 * Controller Witness Attestation — Business Logic
 *
 * All business logic for the POST /api/controller-witness route.
 * The route.ts file is a thin HTTP wrapper; everything testable lives here.
 *
 * Reference: CONTROLLER-WITNESS-SCHEMA.md §4.2.4
 */

// ---------------------------------------------------------------------------
// Error class (mirrors EasRouteError from rep-attestation-frontend)
// ---------------------------------------------------------------------------

export class ControllerWitnessRouteError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ControllerWitnessRouteError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ControllerWitnessAttestationParams {
  attestationUid: string;
  chainId: number;
  easContract: string;
  schemaUid: string;
  subject: string;
  controller: string;
  method: string;
}

export interface ControllerWitnessAttestationResult {
  success: boolean;
  uid: string;
  txHash: string | null;
  blockNumber: number | null;
  observedAt: number;
  existing: boolean;
}

// ---------------------------------------------------------------------------
// Config — approved allowlists loaded from env vars
// ---------------------------------------------------------------------------

export {
  APPROVED_WITNESS_CHAINS,
  APPROVED_CONTROLLER_WITNESS_ATTESTERS,
} from '@/config/controller-witness-config';

import {
  APPROVED_WITNESS_CHAINS,
} from '@/config/controller-witness-config';

import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';
import { getRpcUrl } from '@/lib/rpc';
import { getAllSchemas, getSchema } from '@/config/schemas';
import { getDomainFromDidWeb } from '@/lib/utils/did';
import {
  findControllerInDnsTxt,
  findControllerInDidDoc,
} from '@/lib/server/evidence';
import { loadIssuerPrivateKey } from '@/lib/server/issuer-key';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ZERO_UID = '0x0000000000000000000000000000000000000000000000000000000000000000';

// ---------------------------------------------------------------------------
// Supported evidence methods
// ---------------------------------------------------------------------------

const SUPPORTED_METHODS = ['dns-txt', 'did-json'] as const;
// const SUPPORTED_METHODS_FUTURE = ['dns-txt', 'did-json', 'social-profile'] as const; // social-profile: needs per-platform API integration
export type EvidenceMethod = (typeof SUPPORTED_METHODS)[number];

function isSupportedMethod(m: string): m is EvidenceMethod {
  return (SUPPORTED_METHODS as readonly string[]).includes(m);
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

const HEX_32_BYTES = /^0x[0-9a-fA-F]{64}$/;
const HEX_20_BYTES = /^0x[0-9a-fA-F]{40}$/;
const DID_PATTERN = /^did:[a-z0-9]+:.+$/;

export function validateParams(body: Record<string, unknown>): ControllerWitnessAttestationParams {
  const { attestationUid, chainId, easContract, schemaUid, subject, controller, method } = body;

  // --- required fields presence ---
  const missing: string[] = [];
  if (!attestationUid) missing.push('attestationUid');
  if (chainId === undefined || chainId === null) missing.push('chainId');
  if (!easContract) missing.push('easContract');
  if (!schemaUid) missing.push('schemaUid');
  if (!subject) missing.push('subject');
  if (!controller) missing.push('controller');
  if (!method) missing.push('method');

  if (missing.length > 0) {
    throw new ControllerWitnessRouteError(
      `Missing required fields: ${missing.join(', ')}`,
      400,
      'MISSING_FIELDS',
    );
  }

  // --- format checks ---
  if (typeof attestationUid !== 'string' || !HEX_32_BYTES.test(attestationUid)) {
    throw new ControllerWitnessRouteError(
      'attestationUid must be a 0x-prefixed 32-byte hex string',
      400,
      'MISSING_FIELDS',
    );
  }
  if (typeof chainId !== 'number' || !Number.isInteger(chainId) || chainId <= 0) {
    throw new ControllerWitnessRouteError(
      'chainId must be a positive integer',
      400,
      'MISSING_FIELDS',
    );
  }
  if (typeof easContract !== 'string' || !HEX_20_BYTES.test(easContract)) {
    throw new ControllerWitnessRouteError(
      'easContract must be a 0x-prefixed 20-byte hex string',
      400,
      'MISSING_FIELDS',
    );
  }
  if (typeof schemaUid !== 'string' || !HEX_32_BYTES.test(schemaUid)) {
    throw new ControllerWitnessRouteError(
      'schemaUid must be a 0x-prefixed 32-byte hex string',
      400,
      'MISSING_FIELDS',
    );
  }
  if (typeof subject !== 'string' || !DID_PATTERN.test(subject)) {
    throw new ControllerWitnessRouteError(
      'subject must be a valid DID (did:<method>:<id>)',
      400,
      'INVALID_SUBJECT',
    );
  }
  if (typeof controller !== 'string' || !DID_PATTERN.test(controller)) {
    throw new ControllerWitnessRouteError(
      'controller must be a valid DID (did:<method>:<id>)',
      400,
      'INVALID_CONTROLLER',
    );
  }
  if (typeof method !== 'string' || !isSupportedMethod(method)) {
    throw new ControllerWitnessRouteError(
      `method must be one of: ${SUPPORTED_METHODS.join(', ')}`,
      400,
      'INVALID_METHOD',
    );
  }

  return {
    attestationUid: attestationUid as string,
    chainId: chainId as number,
    easContract: easContract as string,
    schemaUid: schemaUid as string,
    subject: subject as string,
    controller: controller as string,
    method: method as string,
  };
}

// ---------------------------------------------------------------------------
// In-memory duplicate tracking (v1)
// ---------------------------------------------------------------------------

/** Map of "subject|controller" → attestation info for this server's own submissions. */
const witnessCache = new Map<string, { uid: string; attester: string; observedAt: number }>();

function witnessCacheKey(subject: string, controller: string): string {
  return `${subject}|${controller}`;
}

/** v1: in-memory tracking of this server's own attestations. */
export async function checkExistingControllerWitnessAttestation(
  subject: string,
  controller: string,
): Promise<{ uid: string; attester: string; observedAt: number } | null> {
  return witnessCache.get(witnessCacheKey(subject, controller)) ?? null;
}

/**
 * Record a successful attestation in the in-memory cache.
 * Called after a successful EAS submission (Prompt 4).
 */
export function recordWitnessAttestation(
  subject: string,
  controller: string,
  uid: string,
  attester: string,
  observedAt: number,
): void {
  witnessCache.set(witnessCacheKey(subject, controller), { uid, attester, observedAt });
}

/** Gate checks: allowlist validation + on-chain attestation verification. */
export async function verifyTargetControllerAttestation(
  attestationUid: string,
  chainId: number,
  easContract: string,
  schemaUid: string,
  subject: string,
  controller: string,
): Promise<void> {
  // --- Gate 1: Approved chain + EAS contract (in-memory, no RPC) ---
  const approvedContract = APPROVED_WITNESS_CHAINS[chainId];
  if (!approvedContract) {
    throw new ControllerWitnessRouteError(
      `Chain ${chainId} is not approved for controller witness attestations`,
      403,
      'CHAIN_NOT_APPROVED',
    );
  }
  if (approvedContract.toLowerCase() !== easContract.toLowerCase()) {
    throw new ControllerWitnessRouteError(
      `EAS contract ${easContract} is not approved for chain ${chainId}`,
      403,
      'CHAIN_NOT_APPROVED',
    );
  }

  // --- Gate 2: Schema is witness-enabled (derived from schemas.ts) ---
  // A schema is approved for witness if it has a `witness` config AND a
  // non-zero deployedUID (or priorUID) matching the requested schemaUid.
  // This eliminates the need for a separate APPROVED_CONTROLLER_SCHEMA_UIDS allowlist.
  const matchingSchema = getAllSchemas().find((s) =>
    s.witness &&
    s.deployedUIDs &&
    (
      Object.values(s.deployedUIDs).some(
        (uid) => uid.toLowerCase() === schemaUid.toLowerCase() && uid !== ZERO_UID,
      ) ||
      s.priorUIDs && Object.values(s.priorUIDs).some(
        (uids) => uids.some((uid) => uid.toLowerCase() === schemaUid.toLowerCase()),
      )
    ),
  );
  if (!matchingSchema || !matchingSchema.witness) {
    throw new ControllerWitnessRouteError(
      `Schema ${schemaUid} is not a witness-enabled schema`,
      403,
      'SCHEMA_NOT_APPROVED',
    );
  }

  // Field mapping comes directly from the schema's witness config
  const fieldMapping = matchingSchema.witness;

  // --- Gate 4: Attestation exists on-chain (single RPC call) ---
  const rpcUrl = getRpcUrl(chainId);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const eas = new EAS(easContract);
  eas.connect(provider as any);

  let attestation;
  try {
    attestation = await eas.getAttestation(attestationUid);
  } catch (err) {
    throw new ControllerWitnessRouteError(
      `Attestation ${attestationUid} not found on chain ${chainId}`,
      404,
      'ATTESTATION_NOT_FOUND',
    );
  }

  // EAS returns a zeroed-out struct for non-existent UIDs instead of throwing
  if (!attestation.uid || attestation.uid === ZERO_UID || attestation.schema === ZERO_UID) {
    throw new ControllerWitnessRouteError(
      `Attestation ${attestationUid} not found on chain ${chainId}`,
      404,
      'ATTESTATION_NOT_FOUND',
    );
  }

  // --- Gate 5: Schema matches what the caller claimed ---
  if (attestation.schema.toLowerCase() !== schemaUid.toLowerCase()) {
    throw new ControllerWitnessRouteError(
      `Attestation schema ${attestation.schema} does not match claimed schema ${schemaUid}`,
      422,
      'FIELDS_MISMATCH',
    );
  }

  // --- Gate 6: Not revoked ---
  if (attestation.revocationTime !== 0n) {
    throw new ControllerWitnessRouteError(
      `Attestation ${attestationUid} has been revoked`,
      409,
      'ATTESTATION_REVOKED',
    );
  }

  // --- Gate 7: Decode and match subject + controller fields ---
  // matchingSchema was already resolved in Gate 2
  const easSchemaString = matchingSchema.easSchemaString;
  if (!easSchemaString) {
    throw new ControllerWitnessRouteError(
      `No EAS schema string found for schema ${schemaUid} — regenerate schemas.ts`,
      500,
      'SERVER_ERROR',
    );
  }

  try {
    const encoder = new SchemaEncoder(easSchemaString);
    const decoded = encoder.decodeData(attestation.data);

    // Build a name→value map from the decoded data
    const fields: Record<string, string> = {};
    for (const item of decoded) {
      const val = item.value;
      fields[item.name] = typeof val === 'object' && val !== null && 'value' in val
        ? String((val as any).value)
        : String(val);
    }

    const onChainSubject = fields[fieldMapping.subjectField];
    const onChainController = fields[fieldMapping.controllerField];

    if (onChainSubject !== subject) {
      throw new ControllerWitnessRouteError(
        `Subject mismatch: attestation has "${onChainSubject}", request has "${subject}"`,
        422,
        'FIELDS_MISMATCH',
      );
    }
    if (onChainController !== controller) {
      throw new ControllerWitnessRouteError(
        `Controller mismatch: attestation has "${onChainController}", request has "${controller}"`,
        422,
        'FIELDS_MISMATCH',
      );
    }
  } catch (err) {
    if (err instanceof ControllerWitnessRouteError) throw err;
    throw new ControllerWitnessRouteError(
      `Failed to decode attestation data: ${(err as Error).message}`,
      500,
      'SERVER_ERROR',
    );
  }
}

/** Dispatch to the appropriate evidence checker based on method. */
export async function verifyControllerEvidence(
  subject: string,
  controller: string,
  method: string,
): Promise<{ found: boolean; details?: string }> {
  switch (method) {
    case 'dns-txt':
      return checkDnsTxtEvidence(subject, controller);
    case 'did-json':
      return checkDidJsonEvidence(subject, controller);
    default:
      throw new ControllerWitnessRouteError(
        `Unsupported evidence method: ${method}`,
        400,
        'INVALID_METHOD',
      );
  }
}

/**
 * DNS TXT evidence check.
 *
 * Extracts the domain from the subject DID (must be did:web) and queries
 * `_omatrust.<domain>` for a `v=1;controller=<DID>` record whose address
 * matches the controller.
 */
export async function checkDnsTxtEvidence(
  subject: string,
  expectedController: string,
): Promise<{ found: boolean; details?: string }> {
  const domain = getDomainFromDidWeb(subject);
  if (!domain) {
    throw new ControllerWitnessRouteError(
      `Cannot extract domain from subject "${subject}" — dns-txt method requires a did:web subject`,
      400,
      'INVALID_SUBJECT',
    );
  }

  const result = await findControllerInDnsTxt(domain, expectedController);
  if (!result.found) {
    throw new ControllerWitnessRouteError(
      result.details ?? `Controller evidence not found in DNS TXT for ${domain}`,
      404,
      'EVIDENCE_NOT_FOUND',
    );
  }
  return { found: true, details: result.details };
}

/**
 * did.json evidence check.
 *
 * Extracts the domain from the subject DID (must be did:web) and fetches
 * `/.well-known/did.json` looking for the controller address in
 * verificationMethod entries.
 */
export async function checkDidJsonEvidence(
  subject: string,
  expectedController: string,
): Promise<{ found: boolean; details?: string }> {
  const domain = getDomainFromDidWeb(subject);
  if (!domain) {
    throw new ControllerWitnessRouteError(
      `Cannot extract domain from subject "${subject}" — did-json method requires a did:web subject`,
      400,
      'INVALID_SUBJECT',
    );
  }

  const result = await findControllerInDidDoc(domain, expectedController);
  if (!result.found) {
    throw new ControllerWitnessRouteError(
      result.details ?? `Controller evidence not found in did.json for ${domain}`,
      404,
      'EVIDENCE_NOT_FOUND',
    );
  }
  return { found: true, details: result.details };
}

/** Social profile evidence check — not supported in v1 (needs per-platform API). */
// export async function checkSocialProfileEvidence(
//   subject: string,
//   expectedController: string,
// ): Promise<{ found: boolean; details?: string }> {
//   throw new ControllerWitnessRouteError(
//     'social-profile evidence method is not supported in v1',
//     501,
//     'METHOD_NOT_IMPLEMENTED',
//   );
// }

// parseEvidenceString is exported from evidence.ts — use it directly from there

// ---------------------------------------------------------------------------
// Main entry point — stub
// ---------------------------------------------------------------------------

/**
 * Main entry point. Runs gate checks, verifies offchain evidence,
 * submits attestation to EAS. Returns existing UID if duplicate.
 */
export async function submitControllerWitnessAttestation(
  params: ControllerWitnessAttestationParams,
): Promise<ControllerWitnessAttestationResult> {
  // For Prompt 1: all downstream functions are stubs → will throw 501
  // This lets us verify the route wiring and structured logging work.

  // Step 1: Check for existing attestation
  const existing = await checkExistingControllerWitnessAttestation(
    params.subject,
    params.controller,
  );
  if (existing) {
    return {
      success: true,
      uid: existing.uid,
      txHash: null,
      blockNumber: null,
      observedAt: existing.observedAt,
      existing: true,
    };
  }

  // Step 2: Gate checks
  await verifyTargetControllerAttestation(
    params.attestationUid,
    params.chainId,
    params.easContract,
    params.schemaUid,
    params.subject,
    params.controller,
  );

  // Step 3: Evidence verification
  await verifyControllerEvidence(params.subject, params.controller, params.method);

  // Step 4: Submit controller-witness attestation to EAS
  const observedAt = Math.floor(Date.now() / 1000);

  // Look up the controller-witness schema's deployed UID for this chain
  const cwSchema = getSchema('controller-witness');
  const controllerWitnessSchemaUid = cwSchema?.deployedUIDs?.[params.chainId];

  if (!controllerWitnessSchemaUid || controllerWitnessSchemaUid === ZERO_UID) {
    throw new ControllerWitnessRouteError(
      `Controller-witness schema not deployed on chain ${params.chainId}`,
      500,
      'SERVER_ERROR',
    );
  }

  const easSchemaString = cwSchema?.easSchemaString;
  if (!easSchemaString) {
    throw new ControllerWitnessRouteError(
      'Controller-witness easSchemaString not found — regenerate schemas.ts',
      500,
      'SERVER_ERROR',
    );
  }

  // Load server-side private key for signing
  let privateKey: `0x${string}`;
  try {
    privateKey = loadIssuerPrivateKey();
  } catch (err) {
    throw new ControllerWitnessRouteError(
      `Issuer key not configured: ${(err as Error).message}`,
      500,
      'SERVER_ERROR',
    );
  }

  // Create wallet connected to the chain's RPC
  const rpcUrl = getRpcUrl(params.chainId);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Encode attestation data
  const encoder = new SchemaEncoder(easSchemaString);
  const encodedData = encoder.encodeData([
    { name: 'subject', value: params.subject, type: 'string' },
    { name: 'controller', value: params.controller, type: 'string' },
    { name: 'method', value: params.method, type: 'string' },
    { name: 'observedAt', value: BigInt(observedAt), type: 'uint256' },
  ]);

  // Submit to EAS
  const eas = new EAS(params.easContract);
  eas.connect(wallet as any);

  try {
    const tx = await eas.attest({
      schema: controllerWitnessSchemaUid,
      data: {
        recipient: ethers.ZeroAddress, // controller-witness has no specific recipient
        expirationTime: 0n,
        revocable: false,
        refUID: ZERO_UID,
        data: encodedData,
      },
    });

    const newAttestationUID = await tx.wait();
    const txHash = tx.receipt?.hash ?? null;

    // Block number from the receipt
    const blockNumber = tx.receipt?.blockNumber ?? null;

    // Record in cache for duplicate detection
    recordWitnessAttestation(
      params.subject,
      params.controller,
      newAttestationUID,
      wallet.address,
      observedAt,
    );

    console.log(`[controller-witness] Attestation submitted: ${newAttestationUID}`);

    return {
      success: true,
      uid: newAttestationUID,
      txHash,
      blockNumber,
      observedAt,
      existing: false,
    };
  } catch (err) {
    if (err instanceof ControllerWitnessRouteError) throw err;
    const reason = (err as any)?.reason || (err as Error).message;
    throw new ControllerWitnessRouteError(
      `EAS attestation submission failed: ${reason}`,
      500,
      'SERVER_ERROR',
    );
  }
}
