/**
 * DID Verification API Route
 * 
 * Verifies DID ownership and registers attestations:
 * - did:web: Verifies via .well-known/did.json or DNS TXT records
 * - did:pkh: Verifies on-chain contract ownership (owner(), admin(), proxy slots, AccessControl)
 * 
 * RPC Endpoint Strategy:
 * 1. OMA chains: Uses hardcoded RPC from config
 * 2. EVM chains: Uses Thirdweb RPC Edge (https://${chainId}.rpc.thirdweb.com/${apiKey})
 * 3. Non-EVM chains: Future support via QuickNode (Solana, Sui, Aptos)
 * 
 * Required Environment Variables:
 * 
 * Production (Vercel):
 * - THIRDWEB_SECRET_KEY: Thirdweb project secret key (for Managed Vault access)
 * - THIRDWEB_SERVER_WALLET_ADDRESS: Server wallet address from Thirdweb vault
 * - NEXT_PUBLIC_THIRDWEB_CLIENT_ID: For RPC Edge access
 * 
 * Local Development:
 * - ~/.ssh/test-evm-deployment-key: Private key file (same as deployment scripts)
 * - NEXT_PUBLIC_THIRDWEB_CLIENT_ID: For RPC Edge access
 * 
 * Retry Logic:
 * - All RPC calls use exponential backoff (2 attempts: 500ms, 1000ms)
 * - Graceful fallback between ownership check methods
 * 
 * @see https://thirdweb.com/learn/guides/what-is-rpc-edge-and-how-do-i-use-it
 * @see src/lib/rpc.ts for RPC helper functions
 * 
 * IMPORTANT: This route MUST run on Node runtime (not Edge)
 */

// Force Node.js runtime - required for DNS resolution and server wallet
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, readContract } from 'thirdweb';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { defineChain } from 'thirdweb/chains';
import { resolverAbi } from '@/lib/contracts/abi/resolver.abi';
import { env } from '@/config/env';
import { promises as dns } from 'dns';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ethers, verifyMessage } from 'ethers';
import { normalizeDomain } from '@/lib/utils/did';
import { getRpcUrl, withRetry } from '@/lib/rpc';
import { loadIssuerPrivateKeyOrNull, getThirdwebManagedWallet } from '@/lib/server/issuer-key';


// Create Thirdweb client for server-side operations (lazy init to avoid build errors)
let client: ReturnType<typeof createThirdwebClient> | null = null;
function getClient() {
  if (!client) {
    const managedWallet = getThirdwebManagedWallet();
    const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    
    if (managedWallet) {
      // Production: Use Thirdweb Managed Vault secret key
      client = createThirdwebClient({ secretKey: managedWallet.secretKey });
      console.log('[verify-did] Client using Thirdweb Managed Vault');
    } else if (clientId) {
      // Testnet/Dev: Use client ID (server wallet ops use direct private key)
      client = createThirdwebClient({ clientId });
      console.log('[verify-did] Client using Thirdweb client ID');
    } else {
      throw new Error('Neither THIRDWEB_SECRET_KEY nor NEXT_PUBLIC_THIRDWEB_CLIENT_ID is set');
    }
  }
  return client;
}

/**
 * Parse DID to extract domain
 * did:web:example.com → example.com
 */
function parseDid(did: string): string | null {
  if (!did.startsWith('did:web:')) {
    return null;
  }
  return did.replace('did:web:', '');
}

/**
 * Parse SIWE-like message to extract wallet address
 */
function parseSiweMessage(message: string): { address: string | null; domainFromMsg: string | null } {
  try {
    const lines = message.split('\n');
    // First line should be: "0xAddress wants to verify..."
    const firstLine = lines[0] || '';
    const addressMatch = firstLine.match(/^(0x[a-fA-F0-9]{40})/);
    const address = addressMatch ? addressMatch[1].toLowerCase() : null;
    
    // Extract URI line
    const uriLine = lines.find(l => l.startsWith('URI:'));
    const uriMatch = uriLine?.match(/URI:\s*https?:\/\/([^\s]+)/);
    const domainFromMsg = uriMatch ? uriMatch[1].toLowerCase() : null;
    
    return { address, domainFromMsg };
  } catch {
    return { address: null, domainFromMsg: null };
  }
}

/**
 * Recover signer address from message and signature using ethers
 */
function recoverSigner(message: string, signature: string): string {
  try {
    const recovered = verifyMessage(message, signature);
    return recovered.toLowerCase();
  } catch (error) {
    console.error('[verify-did] Failed to recover signer:', error);
    throw new Error('Invalid signature');
  }
}

/**
 * Parse CAIP-10 format: namespace:reference:address
 * Returns { namespace, reference (chainId), address }
 */
function parseCaip10(caip10: string): { namespace: string; reference: string; address: string } | null {
  const match = caip10.match(/^([a-z0-9]+):([a-z0-9]+):(.+)$/i);
  if (!match) return null;
  const [, namespace, reference, address] = match;
  return {
    namespace: namespace.toLowerCase(),
    reference: reference.toLowerCase(),
    address: address.toLowerCase(),
  };
}

/**
 * Method 1: Verify DID ownership via did.json
 */
async function verifyViaDidJson(domain: string, walletAddress: string): Promise<boolean> {
  try {
    const didUrl = `https://${domain}/.well-known/did.json`;
    console.log(`[verify-did] Fetching ${didUrl}`);
    
    const response = await fetch(didUrl, {
      headers: {
        'Accept': 'application/json',
      },
      // 5 second timeout
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      console.log(`[verify-did] did.json not found: ${response.status}`);
      return false;
    }
    
    const didDocument = await response.json();
    console.log(`[verify-did] Fetched did.json:`, JSON.stringify(didDocument).substring(0, 200));
    
    // Look for wallet address in verificationMethod
    if (didDocument.verificationMethod && Array.isArray(didDocument.verificationMethod)) {
      for (const method of didDocument.verificationMethod) {
        const blockchainAccountId = method.blockchainAccountId || method.ethereumAddress;
        if (blockchainAccountId) {
          // Parse CAIP-10 format: eip155:1:0xABC... → 0xABC...
          const addressMatch = blockchainAccountId.match(/0x[a-fA-F0-9]{40}/);
          if (addressMatch && addressMatch[0].toLowerCase() === walletAddress.toLowerCase()) {
            console.log(`[verify-did] ✅ Found matching address in did.json`);
            return true;
          }
        }
      }
    }
    
    console.log(`[verify-did] ❌ No matching address found in did.json`);
    return false;
  } catch (error) {
    console.log(`[verify-did] Error fetching did.json:`, error);
    return false;
  }
}

/**
 * Method 2: Verify DID ownership via DNS TXT record
 * Looks for _omatrust.<domain> TXT with: v=1 caip10=eip155:1:0xABC...
 */
async function verifyViaDnsTxt(domain: string, walletAddress: string): Promise<boolean> {
  try {
    // Query _omatrust subdomain
    const txtDomain = `_omatrust.${domain}`;
    console.log(`[verify-did] Querying DNS TXT records for ${txtDomain}`);
    
    const records = await dns.resolveTxt(txtDomain);
    console.log(`[verify-did] Found ${records.length} TXT records`);
    
    for (const record of records) {
      // Join segments (DNS TXT records can be split into multiple strings)
      const txtValue = Array.isArray(record) ? record.join('') : record;
      console.log(`[verify-did] Checking TXT record: ${txtValue}`);
      
      // Parse v=1 and caip10= values
      const parts = txtValue.trim().split(/\s+/);
      let versionOk = false;
      const controllers: string[] = [];
      
      for (const part of parts) {
        const [key, val] = part.split('=');
        if (!key || !val) continue;
        
        const k = key.trim().toLowerCase();
        const v = val.trim();
        
        if (k === 'v' && v === '1') {
          versionOk = true;
        }
        if (k === 'caip10') {
          controllers.push(v);
        }
      }
      
      if (!versionOk) {
        console.log(`[verify-did] Skipping TXT record without v=1`);
        continue;
      }
      
      if (controllers.length === 0) {
        console.log(`[verify-did] Skipping TXT record without caip10 values`);
        continue;
      }
      
      console.log(`[verify-did] Found ${controllers.length} controller(s) in valid TXT record`);
      
      // Check if wallet address matches any controller
      for (const caip10Value of controllers) {
        const parsed = parseCaip10(caip10Value);
        if (!parsed) {
          console.log(`[verify-did] Invalid CAIP-10 format: ${caip10Value}`);
          continue;
        }
        
        if (parsed.namespace === 'eip155' && parsed.address === walletAddress.toLowerCase()) {
          console.log(`[verify-did] ✅ DNS TXT verification successful (matched ${caip10Value})`);
          return true;
        }
      }
    }
    
    console.log(`[verify-did] ❌ No matching DNS TXT record found`);
    return false;
  } catch (error) {
    console.log(`[verify-did] Error querying DNS:`, error);
    return false;
  }
}

/**
 * Method 3: Verify DID:PKH ownership via on-chain contract control
 * Checks multiple ownership patterns for the contract
 */
async function verifyDidPkh(caip10: string, walletAddress: string): Promise<{ 
  verified: boolean; 
  method?: string; 
  error?: string;
}> {
  // Parse CAIP-10: namespace:reference:address
  const parsed = parseCaip10(caip10);
  if (!parsed) {
    return { verified: false, error: 'Invalid CAIP-10 format' };
  }
  
  const { namespace, reference, address } = parsed;
  
  // Only support EVM chains for now
  if (namespace !== 'eip155') {
    return { verified: false, error: `Unsupported namespace: ${namespace}. Only eip155 (EVM) is currently supported.` };
  }
  
  const chainId = parseInt(reference);
  if (isNaN(chainId)) {
    return { verified: false, error: `Invalid chain ID: ${reference}` };
  }
  
  const contractAddress = address;
  console.log(`[verify-did:pkh] Verifying contract ${contractAddress} on chain ${chainId}`);
  
  try {
    // Get RPC URL using priority system (OMA chain > Thirdweb RPC Edge)
    const rpcUrl = getRpcUrl(chainId, env.chainId, env.rpcUrl);
    console.log(`[verify-did:pkh] Using RPC: ${rpcUrl}`);
    
    // Create ethers provider for this chain with retry logic
    const provider = await withRetry(async () => {
      const p = new ethers.JsonRpcProvider(rpcUrl);
      // Test connection
      await p.getBlockNumber();
      return p;
    });
    
    // Check if address is a contract (with retry)
    const bytecode = await withRetry(() => provider.getCode(contractAddress));
    if (!bytecode || bytecode === '0x') {
      return { verified: false, error: 'Address is not a contract' };
    }
    
    console.log(`[verify-did:pkh] Contract confirmed, checking ownership patterns...`);
    
    // Try multiple ownership patterns (each with retry)
    const checks = [
      () => withRetry(() => checkOwnerFunction(provider, contractAddress, walletAddress)),
      () => withRetry(() => checkAdminFunction(provider, contractAddress, walletAddress)),
      () => withRetry(() => checkProxyAdminSlot(provider, contractAddress, walletAddress)),
      () => withRetry(() => checkAccessControl(provider, contractAddress, walletAddress)),
    ];
    
    for (const check of checks) {
      try {
        const result = await check();
        if (result.verified) {
          console.log(`[verify-did:pkh] ✅ Verified via ${result.method}`);
          return result;
        }
      } catch (error) {
        // Continue to next check
        console.log(`[verify-did:pkh] Check failed, trying next pattern...`);
      }
    }
    
    return { 
      verified: false, 
      error: `Could not verify ownership of contract ${contractAddress}. Tried: owner(), admin(), EIP-1967 proxy admin slot, and AccessControl roles. The connected wallet (${walletAddress}) does not match any of these ownership patterns.`
    };
    
  } catch (error: any) {
    console.error(`[verify-did:pkh] Error verifying contract:`, error);
    return { verified: false, error: `Contract verification error: ${error.message}` };
  }
}

/**
 * Check if contract has owner() function matching wallet
 */
async function checkOwnerFunction(
  provider: ethers.JsonRpcProvider,
  contractAddress: string,
  walletAddress: string
): Promise<{ verified: boolean; method?: string }> {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      ['function owner() view returns (address)'],
      provider
    );
    
    const owner = await contract.owner();
    
    if (owner.toLowerCase() === walletAddress.toLowerCase()) {
      return { verified: true, method: 'owner()' };
    }
    return { verified: false };
  } catch {
    return { verified: false };
  }
}

/**
 * Check if contract has admin() function matching wallet  
 */
async function checkAdminFunction(
  provider: ethers.JsonRpcProvider,
  contractAddress: string,
  walletAddress: string
): Promise<{ verified: boolean; method?: string }> {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      ['function admin() view returns (address)'],
      provider
    );
    
    const admin = await contract.admin();
    
    if (admin.toLowerCase() === walletAddress.toLowerCase()) {
      return { verified: true, method: 'admin()' };
    }
    return { verified: false };
  } catch {
    return { verified: false };
  }
}

/**
 * Check EIP-1967 proxy admin storage slot
 */
async function checkProxyAdminSlot(
  provider: ethers.JsonRpcProvider,
  contractAddress: string,
  walletAddress: string
): Promise<{ verified: boolean; method?: string }> {
  try {
    // EIP-1967 admin slot: keccak256("eip1967.proxy.admin") - 1
    const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
    
    const adminData = await provider.getStorage(contractAddress, ADMIN_SLOT);
    
    if (!adminData || adminData === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return { verified: false };
    }
    
    // Extract address from storage (last 20 bytes)
    const adminAddress = '0x' + adminData.slice(-40);
    
    if (adminAddress.toLowerCase() === walletAddress.toLowerCase()) {
      return { verified: true, method: 'EIP-1967 proxy admin slot' };
    }
    return { verified: false };
  } catch {
    return { verified: false };
  }
}

/**
 * Check AccessControl DEFAULT_ADMIN_ROLE
 */
async function checkAccessControl(
  provider: ethers.JsonRpcProvider,
  contractAddress: string,
  walletAddress: string
): Promise<{ verified: boolean; method?: string }> {
  try {
    // DEFAULT_ADMIN_ROLE = 0x00...00
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    const contract = new ethers.Contract(
      contractAddress,
      ['function hasRole(bytes32 role, address account) view returns (bool)'],
      provider
    );
    
    const hasRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, walletAddress);
    
    if (hasRole) {
      return { verified: true, method: 'AccessControl DEFAULT_ADMIN_ROLE' };
    }
    return { verified: false };
  } catch {
    return { verified: false };
  }
}

/**
 * Register DID in resolver contract using server wallet
 * Production: Uses Thirdweb Managed Vault (HSM-secured)
 * Local dev: Uses SSH private key
 */
async function registerDidInResolver(did: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Get resolver contract reference
    const chain = defineChain({
      id: env.chainId,
      rpc: env.rpcUrl,
    });
    
    const resolverContract = getContract({
      client: getClient(),
      chain,
      address: env.resolverAddress,
      abi: resolverAbi as any,
    });
    
    console.log(`[verify-did] Preparing resolver.addEntry("${did}")`);
    
    // Prepare transaction data
    const transaction = prepareContractCall({
      contract: resolverContract,
      method: 'function addEntry(string) external',
      params: [did],
    });
    
    // 1. Production: Use Thirdweb Managed Vault (HSM-secured, highest priority)
    const managedWallet = getThirdwebManagedWallet();
    if (managedWallet) {
      console.log(`[verify-did] Using Thirdweb Managed Vault (HSM-secured)`);
      console.log(`[verify-did] Wallet: ${managedWallet.walletAddress}`);
      
      // Send via Thirdweb Transactions API
      const response = await fetch('https://api.thirdweb.com/v1/transactions', {
        method: 'POST',
        headers: {
          'x-secret-key': managedWallet.secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chainId: env.chainId,
          from: managedWallet.walletAddress,
          transactions: [transaction],
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Thirdweb API error: ${JSON.stringify(error)}`);
      }
      
      const result = await response.json();
      const txHash = result.result?.transactionIds?.[0];
      
      console.log(`[verify-did] ✅ Transaction sent via Thirdweb API: ${txHash}`);
      
      return {
        success: true,
        txHash,
      };
    }
    
    // 2. Testnet/Development: Use direct private key signing
    else {
      console.log(`[verify-did] Using direct private key signing (ISSUER_PRIVATE_KEY or SSH file)`);
      
      const privateKey = await loadIssuerPrivateKeyOrNull();
      
      if (!privateKey) {
        throw new Error(
          'No authentication method available.\n' +
          'Production: Set THIRDWEB_SECRET_KEY + THIRDWEB_SERVER_WALLET_ADDRESS\n' +
          'Testnet: Set ISSUER_PRIVATE_KEY\n' +
          'Local dev: Create ~/.ssh/local-attestation-key'
        );
      }
      
      // Create account from private key
      const account = privateKeyToAccount({
        client: getClient(),
        privateKey,
      });
      
      console.log(`[verify-did] Wallet: ${account.address}`);
      
      // Send transaction
      const result = await sendTransaction({
        account,
        transaction,
      });
      
      console.log(`[verify-did] ✅ Transaction sent: ${result.transactionHash}`);
      
      return {
        success: true,
        txHash: result.transactionHash,
      };
    }
  } catch (error: any) {
    console.error(`[verify-did] ❌ Error registering DID:`, error);
    return {
      success: false,
      error: error.message || 'Failed to register DID in resolver',
    };
  }
}

/**
 * POST /api/verify-did
 * Verifies DID ownership via SIWE signature and registers in resolver
 */
export async function POST(req: NextRequest) {
  try {
    const { did, message, signature, claimedDomain } = await req.json();
    
    console.log(`[verify-did] Starting verification for DID: ${did}`);
    
    // Validate inputs
    if (!did || !message || !signature || !claimedDomain) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields: did, message, signature, claimedDomain' 
        },
        { status: 400 }
      );
    }
    
    // Step 1: Parse SIWE message to extract address
    const { address: addrFromMsg, domainFromMsg } = parseSiweMessage(message);
    
    if (!addrFromMsg) {
      return NextResponse.json(
        { success: false, message: 'Could not extract wallet address from SIWE message' },
        { status: 400 }
      );
    }
    
    // Step 2: Recover signer from signature using ethers
    let recovered: string;
    try {
      recovered = recoverSigner(message, signature);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, message: `Signature verification failed: ${error.message}` },
        { status: 400 }
      );
    }
    
    // Step 3: Verify recovered address matches address in message
    if (recovered !== addrFromMsg.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: 'Signature/address mismatch - the signature does not match the wallet address in the message' },
        { status: 400 }
      );
    }
    
    // Use the verified address
    const verifiedWallet = recovered;
    
    // Step 4: Verify domain matches (if present in message)
    if (domainFromMsg && domainFromMsg !== claimedDomain.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: 'Domain in message does not match claimed domain' },
        { status: 400 }
      );
    }
    
    console.log(`[verify-did] ✅ SIWE signature verified for wallet: ${verifiedWallet}`);
    
    // Step 5: Branch on DID type
    let verified = false;
    let method: string | undefined = undefined;
    
    if (did.startsWith('did:web:')) {
      // DID:WEB verification
      const normalizedDomain = normalizeDomain(claimedDomain);
      console.log(`[verify-did:web] Verifying ownership for domain: ${normalizedDomain}`);
      
      // Try Method 1: did.json
      verified = await verifyViaDidJson(normalizedDomain, verifiedWallet);
      
      if (verified) {
        method = 'did.json';
        console.log(`[verify-did:web] ✅ Verified via did.json`);
      } else {
        // Try Method 2: DNS TXT (_omatrust.<domain>)
        console.log(`[verify-did:web] Trying DNS TXT verification...`);
        verified = await verifyViaDnsTxt(normalizedDomain, verifiedWallet);
        if (verified) {
          method = 'dns-txt';
          console.log(`[verify-did:web] ✅ Verified via DNS TXT`);
        }
      }
      
      if (!verified) {
        return NextResponse.json(
          {
            success: false,
            message: `Could not verify ownership of ${normalizedDomain}. Please ensure your wallet address (${verifiedWallet}) is in either:\n1. https://${normalizedDomain}/.well-known/did.json (in verificationMethod.blockchainAccountId)\n2. DNS TXT record at _omatrust.${normalizedDomain} (format: v=1 caip10=eip155:1:${verifiedWallet})`,
          },
          { status: 400 }
        );
      }
      
    } else if (did.startsWith('did:pkh:')) {
      // DID:PKH verification
      const caip10 = did.replace('did:pkh:', '');
      console.log(`[verify-did:pkh] Verifying contract ownership for: ${caip10}`);
      
      const pkhResult = await verifyDidPkh(caip10, verifiedWallet);
      
      if (!pkhResult.verified) {
        return NextResponse.json(
          {
            success: false,
            message: pkhResult.error || 'Could not verify contract ownership',
          },
          { status: 400 }
        );
      }
      
      verified = true;
      method = pkhResult.method;
      console.log(`[verify-did:pkh] ✅ Verified via ${method}`);
      
    } else {
      return NextResponse.json(
        {
          success: false,
          message: `Unsupported DID method. Only did:web and did:pkh are currently supported.`,
        },
        { status: 400 }
      );
    }
    
    // Register in resolver contract
    console.log(`[verify-did] Registering DID in resolver...`);
    const registerResult = await registerDidInResolver(did);
    
    if (!registerResult.success) {
      return NextResponse.json(
        {
          success: false,
          verified: true,
          method,
          message: `DID ownership verified via ${method}, but failed to register in resolver: ${registerResult.error}`,
          error: registerResult.error,
        },
        { status: 500 }
      );
    }
    
    // Success!
    return NextResponse.json({
      success: true,
      verified: true,
      method,
      txHash: registerResult.txHash,
      message: `DID verified via ${method} and registered in resolver`,
    });
    
  } catch (error: any) {
    console.error('[verify-did] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        verified: false,
        message: 'Internal server error',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

