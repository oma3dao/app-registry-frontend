/**
 * Unified Verify & Attest Endpoint
 * 
 * Idempotent endpoint that:
 * 1. Checks for existing attestations (fast path)
 * 2. If missing → verifies DID ownership (DNS/contract)
 * 3. If verified → writes attestation to resolver
 * 4. Returns status
 * 
 * This is the single endpoint Step 0 calls for verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createThirdwebClient, getContract, readContract, prepareContractCall, sendTransaction } from 'thirdweb';
import { defineChain } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { ethers } from 'ethers';
import { localhost, omachainTestnet, omachainMainnet } from '@/config/chains';
import { getRpcUrl, withRetry } from '@/lib/rpc';
import { normalizeDomain } from '@/lib/utils/did';
import { loadIssuerPrivateKey, getThirdwebManagedWallet } from '@/lib/server/issuer-key';
import resolverAbi from '@/abi/resolver.json';
import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);

/**
 * Convert schema string to bytes32 hash
 */
function schemaToBytes32(schema: string): `0x${string}` {
  return ethers.id(schema) as `0x${string}`;
}

// Force Node.js runtime
export const runtime = 'nodejs';

// Debug logger
function debug(section: string, message: string, data?: any) {
  console.log(`[verify-and-attest:${section}] ${message}`, data || '');
}

/**
 * Check if DID ownership attestation already exists
 */
async function checkExistingAttestations(
  did: string,
  connectedAddress: string,
  requiredSchemas: string[],
  resolverAddress: string,
  chainId: number,
  clientId: string
): Promise<{ present: string[]; missing: string[] }> {
  debug('check-attestations', `Checking DID ownership for: ${did}`);
  
  const client = createThirdwebClient({ clientId });
  const chain = defineChain(chainId);
  const resolver = getContract({ 
    client, 
    chain, 
    address: resolverAddress,
    abi: resolverAbi as any,
  });
  
  // For ownership schema, check if current owner matches connected address
  const didHash = ethers.id(did) as `0x${string}`;
  debug('check-attestations', `DID hash (ethers.id): ${didHash}`);
  
  try {
    const currentOwner = await readContract({
      contract: resolver,
      method: 'function currentOwner(bytes32 didHash) view returns (address)',
      params: [didHash],
    }) as string;
    
    debug('check-attestations', `Current owner from contract: ${currentOwner}`);
    
    // If current owner matches connected address and is not zero address
    const hasValidOwnership = currentOwner && 
                              currentOwner.toLowerCase() !== '0x0000000000000000000000000000000000000000' &&
                              currentOwner.toLowerCase() === connectedAddress.toLowerCase();
    
    if (hasValidOwnership) {
      debug('check-attestations', `✅ Valid DID ownership attestation exists`);
      return { present: requiredSchemas, missing: [] };
    } else {
      debug('check-attestations', `❌ No valid DID ownership attestation (owner: ${currentOwner})`);
      return { present: [], missing: requiredSchemas };
    }
  } catch (error) {
    debug('check-attestations', `Error checking ownership:`, error);
    return { present: [], missing: requiredSchemas };
  }
}

/**
 * Check DNS TXT record for did:web verification
 */
async function checkDidWebViaDns(domain: string, connectedAddress: string): Promise<boolean> {
  const txtRecordName = `_omatrust.${domain}`;
  debug('verify-did-web', `Checking DNS TXT record: ${txtRecordName}`);
  
  try {
    const records = await resolveTxt(txtRecordName);
    debug('verify-did-web', `Found ${records.length} TXT records`, records);
    
    // Parse records looking for v=1 and caip10 entries
    for (const record of records) {
      const recordText = Array.isArray(record) ? record.join('') : record;
      debug('verify-did-web', `Parsing record: ${recordText}`);
      
      // Split by semicolon OR whitespace (to handle both "v=1;caip10=..." and "v=1 caip10=...")
      const entries = recordText.split(/[;\s]+/).map(e => e.trim()).filter(e => e.length > 0);
      debug('verify-did-web', `Parsed entries:`, entries);
      
      const hasVersion = entries.some(e => e === 'v=1');
      
      if (!hasVersion) {
        debug('verify-did-web', 'No v=1 found, skipping record');
        continue;
      }
      
      const caip10Entries = entries.filter(e => e.startsWith('caip10='));
      debug('verify-did-web', `Found ${caip10Entries.length} CAIP-10 entries`);
      
      for (const entry of caip10Entries) {
        const caip10 = entry.replace('caip10=', '').trim();
        debug('verify-did-web', `Checking CAIP-10: ${caip10}`);
        
        // Extract address from CAIP-10 (format: namespace:reference:address)
        const parts = caip10.split(':');
        if (parts.length === 3) {
          const address = parts[2];
          debug('verify-did-web', `Extracted address: ${address}`);
          
          if (address.toLowerCase() === connectedAddress.toLowerCase()) {
            debug('verify-did-web', '✅ DNS TXT: Address match found!');
            return true;
          }
        }
      }
    }
    
    debug('verify-did-web', 'DNS TXT: No matching address found');
    return false;
  } catch (error) {
    debug('verify-did-web', 'DNS TXT lookup failed:', error);
    return false;
  }
}

/**
 * Check DID document for did:web verification
 */
async function checkDidWebViaDidDoc(domain: string, connectedAddress: string): Promise<boolean> {
  const didDocUrl = `https://${domain}/.well-known/did.json`;
  debug('verify-did-web', `Fetching DID document: ${didDocUrl}`);
  
  try {
    const response = await fetch(didDocUrl, {
      headers: { 'Accept': 'application/json' },
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      debug('verify-did-web', `DID document fetch failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const didDoc = await response.json();
    debug('verify-did-web', 'DID document fetched successfully');
    
    // Look for connected address in verificationMethod
    const verificationMethods = didDoc.verificationMethod || [];
    debug('verify-did-web', `Found ${verificationMethods.length} verification methods`);
    
    for (const method of verificationMethods) {
      // Check blockchainAccountId field (CAIP-10 format)
      if (method.blockchainAccountId) {
        debug('verify-did-web', `Checking blockchainAccountId: ${method.blockchainAccountId}`);
        
        // Extract address from CAIP-10 (format: namespace:reference:address)
        const parts = method.blockchainAccountId.split(':');
        if (parts.length === 3) {
          const address = parts[2];
          debug('verify-did-web', `Extracted address: ${address}`);
          
          if (address.toLowerCase() === connectedAddress.toLowerCase()) {
            debug('verify-did-web', '✅ DID document: Address match found!');
            return true;
          }
        }
      }
      
      // Also check publicKeyHex field (Ethereum address without 0x)
      if (method.publicKeyHex) {
        const pubKeyAddress = '0x' + method.publicKeyHex;
        debug('verify-did-web', `Checking publicKeyHex: ${pubKeyAddress}`);
        
        if (pubKeyAddress.toLowerCase() === connectedAddress.toLowerCase()) {
          debug('verify-did-web', '✅ DID document: Address match found via publicKeyHex!');
          return true;
        }
      }
    }
    
    debug('verify-did-web', 'DID document: No matching address found');
    return false;
  } catch (error) {
    debug('verify-did-web', 'DID document fetch/parse failed:', error);
    return false;
  }
}

/**
 * Verify did:web ownership via DNS TXT record (fast) or DID document (fallback)
 */
async function verifyDidWeb(did: string, connectedAddress: string): Promise<boolean> {
  debug('verify-did-web', `Verifying ${did} for address ${connectedAddress}`);
  
  if (!did.startsWith('did:web:')) {
    debug('verify-did-web', 'Invalid did:web format');
    return false;
  }
  
  const domain = normalizeDomain(did.replace('did:web:', ''));
  debug('verify-did-web', `Normalized domain: ${domain}`);
  
  // Method 1: Check DNS TXT record (fast, preferred)
  const dnsResult = await checkDidWebViaDns(domain, connectedAddress);
  if (dnsResult) {
    return true;
  }
  
  // Method 2: Check DID document (fallback, slower)
  debug('verify-did-web', 'DNS verification failed, trying DID document...');
  const didDocResult = await checkDidWebViaDidDoc(domain, connectedAddress);
  
  if (!didDocResult) {
    debug('verify-did-web', '❌ Both verification methods failed');
  }
  
  return didDocResult;
}

/**
 * Verify did:pkh ownership via contract ownership checks
 */
async function verifyDidPkh(did: string, connectedAddress: string): Promise<boolean> {
  debug('verify-did-pkh', `Verifying ${did} for address ${connectedAddress}`);
  
  if (!did.startsWith('did:pkh:')) {
    debug('verify-did-pkh', 'Invalid did:pkh format');
    return false;
  }
  
  const caip10 = did.replace('did:pkh:', '');
  debug('verify-did-pkh', `CAIP-10: ${caip10}`);
  
  const parts = caip10.split(':');
  if (parts.length !== 3) {
    debug('verify-did-pkh', 'Invalid CAIP-10 format');
    return false;
  }
  
  const [namespace, reference, contractAddress] = parts;
  debug('verify-did-pkh', `Namespace: ${namespace}, Chain: ${reference}, Contract: ${contractAddress}`);
  
  if (namespace !== 'eip155') {
    debug('verify-did-pkh', 'Only EVM chains (eip155) supported');
    return false;
  }
  
  const chainId = parseInt(reference, 10);
  debug('verify-did-pkh', `Chain ID: ${chainId}`);
  
  // Get RPC URL
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  if (!clientId) {
    debug('verify-did-pkh', 'Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID');
    return false;
  }
  
  const rpcUrl = getRpcUrl(chainId);
  debug('verify-did-pkh', `Using RPC: ${rpcUrl}`);
  
  // Create ethers provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Try multiple ownership patterns
  const patterns = [
    { name: 'owner()', sig: 'function owner() view returns (address)' },
    { name: 'admin()', sig: 'function admin() view returns (address)' },
    { name: 'getOwner()', sig: 'function getOwner() view returns (address)' },
  ];
  
  for (const pattern of patterns) {
    try {
      debug('verify-did-pkh', `Trying pattern: ${pattern.name}`);
      const contract = new ethers.Contract(contractAddress, [pattern.sig], provider);
      const ownerAddress = await withRetry(() => contract[pattern.name.replace('()', '')]());
      
      debug('verify-did-pkh', `Owner from ${pattern.name}: ${ownerAddress}`);
      
      if (ownerAddress.toLowerCase() === connectedAddress.toLowerCase()) {
        debug('verify-did-pkh', `✅ Ownership verified via ${pattern.name}`);
        return true;
      }
    } catch (error) {
      debug('verify-did-pkh', `Pattern ${pattern.name} failed:`, error);
    }
  }
  
  // Try EIP-1967 proxy admin slot
  try {
    debug('verify-did-pkh', 'Trying EIP-1967 admin slot');
    const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
    const adminValue = await provider.getStorage(contractAddress, adminSlot);
    const adminAddress = ethers.getAddress('0x' + adminValue.slice(-40));
    
    debug('verify-did-pkh', `Admin from EIP-1967: ${adminAddress}`);
    
    if (adminAddress.toLowerCase() === connectedAddress.toLowerCase()) {
      debug('verify-did-pkh', '✅ Ownership verified via EIP-1967');
      return true;
    }
  } catch (error) {
    debug('verify-did-pkh', 'EIP-1967 check failed:', error);
  }
  
  debug('verify-did-pkh', '❌ No ownership match found');
  return false;
}

/**
 * Write DID ownership attestation to resolver contract
 */
async function writeAttestation(
  did: string,
  connectedAddress: string,
  schema: string,
  resolverAddress: string,
  chainId: number
): Promise<string> {
  debug('write-attestation', `Writing attestation for ${did}, schema: ${schema}`);
  
  // For ownership schema, we use upsertDirect
  // didHash = keccak256(did string)
  // controllerAddress = owner address padded to bytes32
  const didHash = ethers.id(did) as `0x${string}`;
  const controllerAddress = ethers.zeroPadValue(connectedAddress, 32) as `0x${string}`;
  
  debug('write-attestation', `DID hash (ethers.id): ${didHash}`);
  debug('write-attestation', `Controller: ${controllerAddress}`);
  
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  if (!clientId) {
    throw new Error('Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID');
  }
  
  const client = createThirdwebClient({ clientId });
  const chain = defineChain(chainId);
  const resolver = getContract({ client, chain, address: resolverAddress });
  
  // Check for Thirdweb Managed Vault (highest priority - production ready)
  const managedWallet = getThirdwebManagedWallet();
  
  let txHash: string;
  
  if (managedWallet) {
    // Production: Use Thirdweb Managed Vault (HSM-secured)
    debug('write-attestation', 'Using Thirdweb Transactions API');
    
    // Prepare the transaction
    const tx = prepareContractCall({
      contract: resolver,
      method: 'function upsertDirect(bytes32 didHash, bytes32 controllerAddress, uint64 expiresAt)',
      params: [didHash, controllerAddress, 0n], // 0 = never expires
    });
    
    // Send via Thirdweb Transactions API
    const response = await fetch(`https://embedded-wallet.thirdweb.com/api/2023-11-30/transaction/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': managedWallet.secretKey,
      },
      body: JSON.stringify({
        chainId: chainId.toString(),
        transaction: tx,
        from: managedWallet.walletAddress,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      debug('write-attestation', 'Thirdweb API error:', error);
      throw new Error(`Thirdweb API error: ${error}`);
    }
    
    const result = await response.json();
    txHash = result.transactionHash;
    debug('write-attestation', `Transaction sent via Thirdweb: ${txHash}`);
    
  } else {
    // Testnet/Development: Use direct private key signing
    debug('write-attestation', 'Using direct private key signing (ISSUER_PRIVATE_KEY or SSH file)');
    
    const privateKey = loadIssuerPrivateKey();
    const account = privateKeyToAccount({ client, privateKey: privateKey as `0x${string}` });
    
    debug('write-attestation', `Signer address: ${account.address}`);
    
    const tx = prepareContractCall({
      contract: resolver,
      method: 'function upsertDirect(bytes32 didHash, bytes32 controllerAddress, uint64 expiresAt)',
      params: [didHash, controllerAddress, 0n],
    });
    
    const result = await sendTransaction({
      transaction: tx,
      account,
    });
    
    txHash = result.transactionHash;
    debug('write-attestation', `Transaction sent: ${txHash}`);
  }
  
  // Wait for 1 confirmation (fast for testnets)
  debug('write-attestation', 'Waiting for confirmation...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Simple wait
  
  debug('write-attestation', '✅ Attestation written successfully');
  return txHash;
}

/**
 * Main endpoint handler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  debug('main', '=== NEW REQUEST ===');
  
  try {
    const body = await request.json();
    const { did, connectedAddress, requiredSchemas = ['oma3.ownership.v1'] } = body;
    
    debug('main', 'Request body:', { did, connectedAddress, requiredSchemas });
    
    // Validate inputs
    if (!did || typeof did !== 'string') {
      debug('main', 'Invalid DID');
      return NextResponse.json({ ok: false, error: 'DID is required' }, { status: 400 });
    }
    
    if (!connectedAddress || typeof connectedAddress !== 'string') {
      debug('main', 'Invalid connected address');
      return NextResponse.json({ ok: false, error: 'Connected address is required' }, { status: 400 });
    }
    
    // Get active chain config
    const activeChainEnv = process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'localhost';
    debug('main', `Active chain: ${activeChainEnv}`);
    
    let activeChain: any;
    if (activeChainEnv === 'localhost') {
      activeChain = localhost;
    } else if (activeChainEnv === 'omachain-testnet') {
      activeChain = omachainTestnet;
    } else if (activeChainEnv === 'omachain-mainnet') {
      activeChain = omachainMainnet;
    } else {
      debug('main', 'Invalid active chain');
      return NextResponse.json({ ok: false, error: 'Invalid active chain' }, { status: 500 });
    }
    
    if (!activeChain?.contracts?.resolver) {
      debug('main', 'Resolver not configured');
      return NextResponse.json({ ok: false, error: 'Resolver not configured' }, { status: 500 });
    }
    
    debug('main', `Using resolver: ${activeChain.contracts.resolver} on chain ${activeChain.chainId}`);
    
    const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    if (!clientId) {
      debug('main', 'Missing Thirdweb client ID');
      return NextResponse.json({ ok: false, error: 'Thirdweb client ID not configured' }, { status: 500 });
    }
    
    // Step 1: Check for existing attestations
    debug('main', '--- STEP 1: CHECK EXISTING ATTESTATIONS ---');
    const { present, missing } = await checkExistingAttestations(
      did,
      connectedAddress,
      requiredSchemas,
      activeChain.contracts.resolver,
      activeChain.chainId,
      clientId
    );
    
    if (missing.length === 0) {
      debug('main', '✅ All attestations already exist (fast path)');
      const elapsed = Date.now() - startTime;
      return NextResponse.json({
        ok: true,
        status: 'ready',
        attestations: { present, missing },
        debug: {
          did,
          didHash: ethers.id(did),
        },
        message: 'All attestations already exist',
        elapsed: `${elapsed}ms`,
      });
    }
    
    // Step 2: Verify DID ownership
    debug('main', '--- STEP 2: VERIFY DID OWNERSHIP ---');
    let verified = false;
    
    if (did.startsWith('did:web:')) {
      verified = await verifyDidWeb(did, connectedAddress);
    } else if (did.startsWith('did:pkh:')) {
      verified = await verifyDidPkh(did, connectedAddress);
    } else {
      debug('main', 'Unsupported DID type');
      return NextResponse.json({ ok: false, error: 'Unsupported DID type' }, { status: 400 });
    }
    
    if (!verified) {
      debug('main', '❌ DID verification failed');
      const elapsed = Date.now() - startTime;
      return NextResponse.json({
        ok: false,
        status: 'failed',
        error: 'DID ownership verification failed',
        attestations: { present, missing },
        elapsed: `${elapsed}ms`,
      }, { status: 403 });
    }
    
    debug('main', '✅ DID ownership verified');
    
    // Step 3: Write missing attestations
    debug('main', '--- STEP 3: WRITE ATTESTATIONS ---');
    const txHashes: string[] = [];
    const writeErrors: { schema: string; error: string }[] = [];
    
    for (const schema of missing) {
      try {
        const txHash = await writeAttestation(
          did,
          connectedAddress,
          schema,
          activeChain.contracts.resolver,
          activeChain.chainId
        );
        txHashes.push(txHash);
        debug('main', `✅ Attestation written for schema ${schema}: ${txHash}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        debug('main', `❌ Failed to write attestation for schema ${schema}:`, error);
        writeErrors.push({ schema, error: errorMsg });
      }
    }
    
    debug('main', `Wrote ${txHashes.length}/${missing.length} attestations`);
    
    // Check if all required attestations were written
    if (writeErrors.length > 0 && txHashes.length === 0) {
      // All writes failed
      debug('main', '❌ All attestation writes failed');
      const elapsed = Date.now() - startTime;
      return NextResponse.json({
        ok: false,
        status: 'failed',
        error: 'Failed to write attestations to blockchain',
        details: writeErrors,
        attestations: { present, missing },
        elapsed: `${elapsed}ms`,
      }, { status: 500 });
    }
    
    // Success: at least some attestations were written (or all were already present)
    // Re-check current owner after writes
    let currentOwnerAfter: string | null = null;
    try {
      const client = createThirdwebClient({ clientId });
      const chain = defineChain(activeChain.chainId);
      const resolver = getContract({ client, chain, address: activeChain.contracts.resolver, abi: resolverAbi as any });
      const didHash = ethers.id(did) as `0x${string}`;
      currentOwnerAfter = await readContract({
        contract: resolver,
        method: 'function currentOwner(bytes32 didHash) view returns (address)',
        params: [didHash],
      }) as string;
      debug('main', `Post-write currentOwner: ${currentOwnerAfter}`);
    } catch (e) {
      debug('main', 'Post-write currentOwner check failed:', e);
    }

    const elapsed = Date.now() - startTime;
    debug('main', `=== REQUEST COMPLETE (${elapsed}ms) ===`);
    
    return NextResponse.json({
      ok: true,
      status: 'ready',
      attestations: {
        present: [...present, ...missing.slice(0, txHashes.length)], // Only mark as present if written
        missing: missing.slice(txHashes.length), // Any that failed to write
      },
      txHashes,
      ...(writeErrors.length > 0 && { warnings: writeErrors }),
      debug: {
        did,
        didHash: ethers.id(did),
        currentOwnerAfter,
      },
      elapsed: `${elapsed}ms`,
    });
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    debug('main', '❌ ERROR:', error);
    
    return NextResponse.json({
      ok: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      elapsed: `${elapsed}ms`,
    }, { status: 500 });
  }
}
