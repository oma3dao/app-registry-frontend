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

// Verification result types
interface VerificationResult {
  success: boolean;
  error?: string;
  details?: string;
  method?: 'dns' | 'did-document' | 'contract' | 'minting-wallet';
}

const resolveTxt = promisify(dns.resolveTxt);



// Force Node.js runtime
export const runtime = 'nodejs';

// Check if debug mode is enabled
const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_ADAPTER === 'true';

// Debug logger
function debug(section: string, message: string, data?: any) {
  console.log(`[verify-and-attest:${section}] ${message}`, data || '');
}

// Validate Ethereum address format
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
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
    const errorMsg = error instanceof Error ? error.message : String(error);
    debug('check-attestations', `Error checking ownership: ${errorMsg}`, error);

    // RPC errors mean we can't verify existing attestations, so assume missing
    if (errorMsg.includes('timeout') || errorMsg.includes('network') || errorMsg.includes('connection')) {
      debug('check-attestations', 'RPC/network error - assuming attestations are missing');
    }

    return { present: [], missing: requiredSchemas };
  }
}

/**
 * Check DNS TXT record for did:web verification
 */
async function checkDidWebViaDns(domain: string, connectedAddress: string): Promise<VerificationResult> {
  const txtRecordName = `_omatrust.${domain}`;
  debug('verify-did-web', `Checking DNS TXT record: ${txtRecordName}`);

  try {
    const records = await resolveTxt(txtRecordName);
    debug('verify-did-web', `Found ${records.length} TXT records`, records);

    if (records.length === 0) {
      return {
        success: false,
        error: 'No DNS TXT record found',
        details: `No TXT record found at ${txtRecordName}. Create a TXT record with value: v=1 controller=eip155:66238:${connectedAddress}`
      };
    }

    let foundValidRecord = false;
    let foundAddresses: string[] = [];

    // Parse records looking for v=1 and controller entries (also support legacy caip10)
    for (const record of records) {
      const recordText = Array.isArray(record) ? record.join('') : record;
      debug('verify-did-web', `Parsing record: ${recordText}`);

      // Split by semicolon OR whitespace (to handle both "v=1;controller=..." and "v=1 controller=...")
      const entries = recordText.split(/[;\s]+/).map(e => e.trim()).filter(e => e.length > 0);
      debug('verify-did-web', `Parsed entries:`, entries);

      const hasVersion = entries.some(e => e === 'v=1');

      if (!hasVersion) {
        debug('verify-did-web', 'No v=1 found, skipping record');
        continue;
      }

      foundValidRecord = true;
      // Support both new 'controller=' and legacy 'caip10=' formats
      const controllerEntries = entries.filter(e => e.startsWith('controller=') || e.startsWith('caip10='));
      debug('verify-did-web', `Found ${controllerEntries.length} controller entries`);

      for (const entry of controllerEntries) {
        const controllerValue = entry.replace('controller=', '').replace('caip10=', '').trim();
        debug('verify-did-web', `Checking controller: ${controllerValue}`);

        // Extract address from CAIP-10 (format: namespace:reference:address)
        const parts = controllerValue.split(':');
        if (parts.length === 3) {
          const address = parts[2];
          foundAddresses.push(address);
          debug('verify-did-web', `Extracted address: ${address}`);

          if (address.toLowerCase() === connectedAddress.toLowerCase()) {
            debug('verify-did-web', '✅ DNS TXT: Address match found!');
            return { success: true };
          }
        }
      }
    }

    if (!foundValidRecord) {
      return {
        success: false,
        error: 'Invalid DNS TXT record format',
        details: `Found TXT record at ${txtRecordName} but missing "v=1". Record should be: v=1 controller=eip155:66238:${connectedAddress}`
      };
    }

    if (foundAddresses.length === 0) {
      return {
        success: false,
        error: 'No controller address in DNS TXT record',
        details: `Found valid TXT record at ${txtRecordName} but no controller address. Add: controller=eip155:66238:${connectedAddress}`
      };
    }

    debug('verify-did-web', 'DNS TXT: No matching address found');
    return {
      success: false,
      error: 'Address mismatch in DNS TXT record',
      details: `Found addresses [${foundAddresses.join(', ')}] in TXT record at ${txtRecordName}, but expected ${connectedAddress}`
    };
  } catch (error) {
    debug('verify-did-web', 'DNS TXT lookup failed:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: 'DNS lookup failed',
      details: `Failed to query DNS TXT record at ${txtRecordName}: ${errorMsg}`
    };
  }
}

/**
 * Check DID document for did:web verification
 */
async function checkDidWebViaDidDoc(domain: string, connectedAddress: string): Promise<VerificationResult> {
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
      return {
        success: false,
        error: 'DID document not accessible',
        details: `Failed to fetch DID document at ${didDocUrl}: ${response.status} ${response.statusText}. Ensure the file exists and is publicly accessible.`
      };
    }

    const didDoc = await response.json();
    debug('verify-did-web', 'DID document fetched successfully');

    // Look for connected address in verificationMethod
    const verificationMethods = didDoc.verificationMethod || [];
    debug('verify-did-web', `Found ${verificationMethods.length} verification methods`);

    if (verificationMethods.length === 0) {
      return {
        success: false,
        error: 'No verification methods in DID document',
        details: `DID document at ${didDocUrl} exists but has no verificationMethod array. Add a verification method with your address.`
      };
    }

    let foundAddresses: string[] = [];

    for (const method of verificationMethods) {
      // Check blockchainAccountId field (CAIP-10 format)
      if (method.blockchainAccountId) {
        debug('verify-did-web', `Checking blockchainAccountId: ${method.blockchainAccountId}`);

        // Extract address from CAIP-10 (format: namespace:reference:address)
        const parts = method.blockchainAccountId.split(':');
        if (parts.length === 3) {
          const address = parts[2];
          foundAddresses.push(address);
          debug('verify-did-web', `Extracted address: ${address}`);

          if (address.toLowerCase() === connectedAddress.toLowerCase()) {
            debug('verify-did-web', '✅ DID document: Address match found!');
            return { success: true };
          }
        }
      }

      // Also check publicKeyHex field (Ethereum address without 0x)
      if (method.publicKeyHex) {
        const pubKeyAddress = '0x' + method.publicKeyHex;
        foundAddresses.push(pubKeyAddress);
        debug('verify-did-web', `Checking publicKeyHex: ${pubKeyAddress}`);

        if (pubKeyAddress.toLowerCase() === connectedAddress.toLowerCase()) {
          debug('verify-did-web', '✅ DID document: Address match found via publicKeyHex!');
          return { success: true };
        }
      }
    }

    debug('verify-did-web', 'DID document: No matching address found');
    return {
      success: false,
      error: 'Address not found in DID document',
      details: `Found addresses [${foundAddresses.join(', ')}] in DID document at ${didDocUrl}, but expected ${connectedAddress}. Update your verificationMethod to include your address.`
    };
  } catch (error) {
    debug('verify-did-web', 'DID document fetch/parse failed:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: 'DID document fetch failed',
      details: `Failed to fetch or parse DID document at ${didDocUrl}: ${errorMsg}`
    };
  }
}

/**
 * Verify did:web ownership via DNS TXT record (fast) or DID document (fallback)
 */
async function verifyDidWeb(did: string, connectedAddress: string): Promise<VerificationResult> {
  debug('verify-did-web', `Verifying ${did} for address ${connectedAddress}`);

  if (!did.startsWith('did:web:')) {
    debug('verify-did-web', 'Invalid did:web format');
    return {
      success: false,
      error: 'Invalid DID format',
      details: 'DID must start with "did:web:"'
    };
  }

  const domain = normalizeDomain(did.replace('did:web:', ''));
  debug('verify-did-web', `Normalized domain: ${domain}`);

  // Method 1: Check DNS TXT record (fast, preferred)
  const dnsResult = await checkDidWebViaDns(domain, connectedAddress);
  if (dnsResult.success) {
    return { success: true, method: 'dns' };
  }

  // Method 2: Check DID document (fallback, slower)
  debug('verify-did-web', 'DNS verification failed, trying DID document...');
  const didDocResult = await checkDidWebViaDidDoc(domain, connectedAddress);

  if (didDocResult.success) {
    return { success: true, method: 'did-document' };
  }

  // Both methods failed - return detailed error
  debug('verify-did-web', '❌ Both verification methods failed');
  return {
    success: false,
    error: 'DID ownership verification failed',
    details: `DNS check: ${dnsResult.error || 'Failed'}. DID document check: ${didDocResult.error || 'Failed'}. Ensure you have either: 1) DNS TXT record at _omatrust.${domain} with value "v=1 controller=eip155:66238:${connectedAddress}" OR 2) DID document at https://${domain}/.well-known/did.json with your address in verificationMethod`
  };
}

/**
 * Verify ownership via onchain transfer (Section 5.1.3.1.2.2)
 * 
 * Verifies that a deterministic amount was sent from controlling wallet to minting wallet
 */
async function verifyViaTransfer(
  did: string,
  controllingWallet: string,
  mintingWallet: string,
  chainId: number,
  txHash: string,
  provider: ethers.JsonRpcProvider
): Promise<VerificationResult> {
  debug('verify-transfer', `Verifying transfer: ${txHash}`);

  try {
    // 1. Get transaction
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return {
        success: false,
        error: 'Transaction not found',
        details: `Transaction ${txHash} not found on chain ${chainId}`
      };
    }

    debug('verify-transfer', `Transaction found:`);
    debug('verify-transfer', `  From: ${tx.from}`);
    debug('verify-transfer', `  To: ${tx.to}`);
    debug('verify-transfer', `  Value: ${tx.value.toString()} wei (${ethers.formatEther(tx.value)} OMA)`);
    debug('verify-transfer', `  Block: ${tx.blockNumber}`);

    // 2. Get receipt for confirmation
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return {
        success: false,
        error: 'Transaction not confirmed',
        details: 'Transaction exists but is not yet confirmed. Please wait for confirmation.'
      };
    }

    debug('verify-transfer', `Transaction confirmed in block ${receipt.blockNumber}`);

    // 3. Check minimum confirmations (3 blocks)
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;
    
    debug('verify-transfer', `Current block: ${currentBlock}`);
    debug('verify-transfer', `Transaction block: ${receipt.blockNumber}`);
    debug('verify-transfer', `Confirmations: ${confirmations}`);
    debug('verify-transfer', `✅ Transaction is confirmed (included in block)`);
    
    // Note: We don't require multiple confirmations because:
    // 1. On optimistic rollups, blocks aren't created frequently
    // 2. The receipt proves the transaction was included
    // 3. Similar to did:web, we verify the proof exists, not wait for finality

    // 4. Verify sender
    debug('verify-transfer', `Verifying sender:`);
    debug('verify-transfer', `  Expected (controlling wallet): ${controllingWallet}`);
    debug('verify-transfer', `  Actual (tx.from): ${tx.from}`);
    debug('verify-transfer', `  Match: ${tx.from.toLowerCase() === controllingWallet.toLowerCase()}`);
    
    if (tx.from.toLowerCase() !== controllingWallet.toLowerCase()) {
      return {
        success: false,
        error: 'Wrong sender',
        details: `Transaction sender is ${tx.from}, but expected controlling wallet ${controllingWallet}`
      };
    }

    // 5. Verify recipient
    debug('verify-transfer', `Verifying recipient:`);
    debug('verify-transfer', `  Expected (minting wallet): ${mintingWallet}`);
    debug('verify-transfer', `  Actual (tx.to): ${tx.to}`);
    debug('verify-transfer', `  Match: ${tx.to?.toLowerCase() === mintingWallet.toLowerCase()}`);
    
    if (!tx.to || tx.to.toLowerCase() !== mintingWallet.toLowerCase()) {
      return {
        success: false,
        error: 'Wrong recipient',
        details: `Transaction recipient is ${tx.to}, but expected minting wallet ${mintingWallet}`
      };
    }

    // 6. Calculate expected amount using spec formula (OMATrust Proof Spec §5.3.6)
    // Import the calculation function
    const { calculateTransferAmount, buildPkhDid, PROOF_PURPOSE } = await import('@/lib/verification/onchain-transfer');
    // Subject = the DID being proven, Counterparty = minting wallet (recipient)
    const counterpartyDid = buildPkhDid(chainId, mintingWallet);
    const expectedAmount = calculateTransferAmount(did, counterpartyDid, chainId, PROOF_PURPOSE.SHARED_CONTROL);

    debug('verify-transfer', `Verifying amount:`);
    debug('verify-transfer', `  Expected: ${expectedAmount.toString()} wei (${ethers.formatEther(expectedAmount)} OMA)`);
    debug('verify-transfer', `  Actual: ${tx.value.toString()} wei (${ethers.formatEther(tx.value)} OMA)`);
    debug('verify-transfer', `  Match: ${tx.value === expectedAmount}`);

    // 7. Verify amount
    if (tx.value !== expectedAmount) {
      return {
        success: false,
        error: 'Wrong amount',
        details: `Transaction amount is ${tx.value.toString()} wei, but expected ${expectedAmount.toString()} wei. The amount must be exact.`
      };
    }

    // 8. Log transaction age (for debugging, but no restriction)
    const block = await provider.getBlock(receipt.blockNumber);
    if (block) {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const age = currentTimestamp - block.timestamp;
      debug('verify-transfer', `Transaction age: ${age} seconds (${Math.floor(age / 60)} minutes)`);
      // Note: We don't restrict transaction age because:
      // 1. Similar to did:web, ownership proof is valid regardless of when it was created
      // 2. The transfer itself is the proof of ownership at that point in time
      // 3. If ownership changes later, a new attestation can be created
    }

    // 9. Success!
    debug('verify-transfer', '✅ Transfer verified successfully');
    return {
      success: true,
      method: 'contract',
      details: `Verified via onchain transfer (tx: ${txHash})`
    };

  } catch (error) {
    debug('verify-transfer', 'Error:', error);
    return {
      success: false,
      error: 'Transfer verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Discover the controlling wallet of a contract (without verification)
 */
async function discoverControllingWallet(
  chainId: number,
  contractAddress: string,
  provider: ethers.JsonRpcProvider
): Promise<string | null> {
  debug('discover-wallet', `Discovering controlling wallet for ${contractAddress}`);

  // Try multiple ownership patterns
  const patterns = [
    { name: 'owner()', sig: 'function owner() view returns (address)' },
    { name: 'admin()', sig: 'function admin() view returns (address)' },
    { name: 'getOwner()', sig: 'function getOwner() view returns (address)' },
  ];

  for (const pattern of patterns) {
    try {
      debug('discover-wallet', `Trying pattern: ${pattern.name}`);
      const contract = new ethers.Contract(contractAddress, [pattern.sig], provider);
      const ownerAddress = await withRetry(() => contract[pattern.name.replace('()', '')]());

      debug('discover-wallet', `Owner from ${pattern.name}: ${ownerAddress}`);

      if (ownerAddress && ownerAddress !== '0x0000000000000000000000000000000000000000') {
        return ownerAddress;
      }
    } catch (error) {
      debug('discover-wallet', `Pattern ${pattern.name} failed`);
    }
  }

  // Try EIP-1967 proxy admin slot
  try {
    debug('discover-wallet', 'Trying EIP-1967 admin slot');
    const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
    const adminValue = await provider.getStorage(contractAddress, adminSlot);

    if (adminValue && adminValue !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      const adminAddress = ethers.getAddress('0x' + adminValue.slice(-40));
      debug('discover-wallet', `Admin from EIP-1967: ${adminAddress}`);

      if (adminAddress !== '0x0000000000000000000000000000000000000000') {
        return adminAddress;
      }
    }
  } catch (error) {
    debug('discover-wallet', 'EIP-1967 check failed');
  }

  return null;
}

/**
 * Verify did:pkh ownership via contract ownership checks or transfer
 */
async function verifyDidPkh(
  did: string,
  connectedAddress: string,
  txHash?: string
): Promise<VerificationResult> {
  debug('verify-did-pkh', `Verifying ${did} for address ${connectedAddress}`);

  if (!did.startsWith('did:pkh:')) {
    debug('verify-did-pkh', 'Invalid did:pkh format');
    return {
      success: false,
      error: 'Invalid DID format',
      details: 'DID must start with "did:pkh:"'
    };
  }

  const caip10 = did.replace('did:pkh:', '');
  debug('verify-did-pkh', `CAIP-10: ${caip10}`);

  const parts = caip10.split(':');
  if (parts.length !== 3) {
    debug('verify-did-pkh', 'Invalid CAIP-10 format');
    return {
      success: false,
      error: 'Invalid CAIP-10 format',
      details: 'CAIP-10 must be in format "namespace:reference:address"'
    };
  }

  const [namespace, reference, contractAddress] = parts;
  debug('verify-did-pkh', `Namespace: ${namespace}, Chain: ${reference}, Contract: ${contractAddress}`);

  if (namespace !== 'eip155') {
    debug('verify-did-pkh', 'Only EVM chains (eip155) supported');
    return {
      success: false,
      error: 'Unsupported blockchain',
      details: 'Only EVM chains (eip155) are supported'
    };
  }

  const chainId = parseInt(reference, 10);
  debug('verify-did-pkh', `Chain ID: ${chainId}`);

  // Get RPC URL
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  if (!clientId) {
    debug('verify-did-pkh', 'Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID');
    return {
      success: false,
      error: 'Server configuration error',
      details: 'Missing Thirdweb client ID'
    };
  }

  const rpcUrl = getRpcUrl(chainId);
  debug('verify-did-pkh', `Using RPC: ${rpcUrl}`);

  // Create ethers provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // If txHash provided, use transfer verification method (5.1.3.1.2.2)
  if (txHash) {
    debug('verify-did-pkh', `🔄 Using TRANSFER verification method`);
    debug('verify-did-pkh', `Transaction hash: ${txHash}`);

    // First, discover the controlling wallet
    const controllingWallet = await discoverControllingWallet(chainId, contractAddress, provider);

    if (!controllingWallet) {
      return {
        success: false,
        error: 'Could not discover controlling wallet',
        details: 'Contract does not have standard ownership functions (owner, admin, getOwner) or EIP-1967 proxy admin slot'
      };
    }

    debug('verify-did-pkh', `Discovered controlling wallet: ${controllingWallet}`);

    // Verify the transfer
    const transferResult = await verifyViaTransfer(
      did,
      controllingWallet,
      connectedAddress,
      chainId,
      txHash,
      provider
    );

    if (transferResult.success) {
      debug('verify-did-pkh', '✅ Ownership verified via onchain transfer');
      return transferResult;
    } else {
      debug('verify-did-pkh', `❌ Transfer verification failed: ${transferResult.error}`);
      return transferResult;
    }
  }

  // Otherwise, use automated address matching (5.1.3.1.2.1)
  debug('verify-did-pkh', '⚡ Using AUTOMATED address matching method');
  debug('verify-did-pkh', `Will check if connectedAddress (${connectedAddress}) owns or IS the contract (${contractAddress})`);

  // First, check if connectedAddress directly owns/controls the contract
  const patterns = [
    { name: 'owner()', sig: 'function owner() view returns (address)' },
    { name: 'admin()', sig: 'function admin() view returns (address)' },
    { name: 'getOwner()', sig: 'function getOwner() view returns (address)' },
  ];

  let controllingWallet: string | null = null;

  for (const pattern of patterns) {
    try {
      debug('verify-did-pkh', `Trying pattern: ${pattern.name}`);
      const contract = new ethers.Contract(contractAddress, [pattern.sig], provider);
      const ownerAddress = await withRetry(() => contract[pattern.name.replace('()', '')]());

      debug('verify-did-pkh', `Owner from ${pattern.name}: ${ownerAddress}`);

      // Store the controlling wallet for later check
      if (!controllingWallet && ownerAddress !== ethers.ZeroAddress) {
        controllingWallet = ownerAddress;
      }

      if (ownerAddress.toLowerCase() === connectedAddress.toLowerCase()) {
        debug('verify-did-pkh', `✅ Ownership verified via ${pattern.name}`);
        return { success: true, method: 'contract' };
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

    if (!controllingWallet && adminAddress !== ethers.ZeroAddress) {
      controllingWallet = adminAddress;
    }

    if (adminAddress.toLowerCase() === connectedAddress.toLowerCase()) {
      debug('verify-did-pkh', '✅ Ownership verified via EIP-1967');
      return { success: true, method: 'contract' };
    }
  } catch (error) {
    debug('verify-did-pkh', 'EIP-1967 check failed:', error);
  }

  // If connectedAddress doesn't own the contract, check if it's the minting wallet
  // and the controlling wallet exists
  debug('verify-did-pkh', `Connected address doesn't own contract. Checking if it's the minting wallet...`);
  debug('verify-did-pkh', `Contract address (minting wallet): ${contractAddress}`);
  debug('verify-did-pkh', `Connected address: ${connectedAddress}`);
  debug('verify-did-pkh', `Controlling wallet: ${controllingWallet}`);

  if (contractAddress.toLowerCase() === connectedAddress.toLowerCase() && controllingWallet) {
    debug('verify-did-pkh', '✅ Connected address IS the minting wallet (contract address)');
    return {
      success: true,
      method: 'minting-wallet',
      details: `Verified: connected address matches the DID contract address (minting wallet). Controlling wallet: ${controllingWallet}`
    };
  }

  debug('verify-did-pkh', '❌ No ownership match found');
  return {
    success: false,
    error: 'Contract ownership verification failed',
    details: `Connected address ${connectedAddress} is neither the contract owner/admin (${controllingWallet || 'not found'}) nor the minting wallet (${contractAddress}). Please connect the correct wallet or use the transfer verification method.`
  };
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

  // Declare variables outside try block for catch block access
  let issuerAddress = 'Unknown';
  let issuerType = 'Unknown';
  let activeChain: any = null;

  try {
    const body = await request.json();
    const { did, connectedAddress, requiredSchemas = ['oma3.ownership.v1'], txHash } = body;

    debug('main', 'Request body:', { did, connectedAddress, requiredSchemas, txHash });
    debug('main', `🔍 Verification method: ${txHash ? '🔄 TRANSFER (txHash provided)' : '⚡ AUTOMATED (no txHash)'}`);

    // Validate inputs
    if (!did || typeof did !== 'string') {
      debug('main', 'Invalid DID');
      return NextResponse.json({
        ok: false,
        error: 'DID is required'
      }, { status: 400 });
    }

    if (!connectedAddress || typeof connectedAddress !== 'string') {
      debug('main', 'Invalid connected address');
      return NextResponse.json({
        ok: false,
        error: 'Connected address is required'
      }, { status: 400 });
    }

    // Validate Ethereum address format
    if (!isValidEthereumAddress(connectedAddress)) {
      debug('main', 'Invalid Ethereum address format');
      return NextResponse.json({
        ok: false,
        error: 'Invalid Ethereum address format',
        details: 'Address must be a valid Ethereum address (0x followed by 40 hex characters)'
      }, { status: 400 });
    }

    // Get active chain config
    const activeChainEnv = process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'localhost';
    debug('main', `Active chain: ${activeChainEnv}`);
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

    // Derive issuer information once at the beginning
    try {
      const managedWallet = getThirdwebManagedWallet();
      if (managedWallet) {
        issuerAddress = managedWallet.walletAddress;
        issuerType = 'Thirdweb Managed Wallet';
      } else {
        const privateKey = loadIssuerPrivateKey();
        const client = createThirdwebClient({ clientId });
        const account = privateKeyToAccount({ client, privateKey: privateKey as `0x${string}` });
        issuerAddress = account.address;
        issuerType = 'Direct Private Key';
      }
      debug('main', `Issuer: ${issuerType} (${issuerAddress})`);
    } catch (e) {
      issuerAddress = `Error: ${e instanceof Error ? e.message : String(e)}`;
      issuerType = 'Error';
      debug('main', `Issuer derivation failed: ${issuerAddress}`);
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
        ...(isDebugMode && {
          debug: {
            did,
            didHash: ethers.id(did),
          }
        }),
        message: 'All attestations already exist',
        elapsed: `${elapsed}ms`,
      });
    }

    // Step 2: Verify DID ownership
    debug('main', '--- STEP 2: VERIFY DID OWNERSHIP ---');
    let verificationResult: VerificationResult;

    if (did.startsWith('did:web:')) {
      verificationResult = await verifyDidWeb(did, connectedAddress);
    } else if (did.startsWith('did:pkh:')) {
      verificationResult = await verifyDidPkh(did, connectedAddress, txHash);
    } else {
      debug('main', 'Unsupported DID type');
      return NextResponse.json({
        ok: false,
        error: 'Unsupported DID type',
        details: 'Only did:web: and did:pkh: are supported'
      }, { status: 400 });
    }

    if (!verificationResult.success) {
      debug('main', '❌ DID verification failed');
      const elapsed = Date.now() - startTime;
      return NextResponse.json({
        ok: false,
        status: 'failed',
        error: verificationResult.error || 'DID ownership verification failed',
        details: verificationResult.details,
        method: verificationResult.method,
        attestations: { present, missing },
        ...(isDebugMode && {
          debug: {
            did,
            didHash: ethers.id(did),
            connectedAddress,
            activeChain: activeChain.name,
            chainId: activeChain.chainId,
            contractAddresses: {
              registry: activeChain.contracts.registry,
              metadata: activeChain.contracts.metadata,
              resolver: activeChain.contracts.resolver,
            }
          }
        }),
        elapsed: `${elapsed}ms`,
      }, { status: 403 });
    }

    debug('main', '✅ DID ownership verified');

    // Step 3: Write missing attestations
    debug('main', '--- STEP 3: WRITE ATTESTATIONS ---');
    const txHashes: string[] = [];
    const writeErrors: {
      schema: string;
      error: string;  // Stringified error object
      diagnostics?: {
        issuerAddress: string;
        contractAddress: string;
        chainId: number;
        didHash: string;
        controllerAddress: string;
        payload: any;
      };
    }[] = [];

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
        debug('main', `❌ Failed to write attestation for schema ${schema}:`, error);

        // Just stringify the entire error - no parsing, no reconstruction
        const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);

        writeErrors.push({
          schema,
          error: errorString,
          // Only include sensitive debug info in debug mode
          ...(isDebugMode && {
            diagnostics: {
              issuerAddress,
              contractAddress: activeChain.contracts.resolver,
              chainId: activeChain.chainId,
              didHash: ethers.id(did),
              controllerAddress: ethers.zeroPadValue(connectedAddress, 32),
              payload: {
                method: 'upsertDirect',
                params: [ethers.id(did), ethers.zeroPadValue(connectedAddress, 32), '0'],
                did,
                connectedAddress,
                schema
              }
            }
          })
        });
      }
    }

    debug('main', `Wrote ${txHashes.length}/${missing.length} attestations`);

    // Check if all required attestations were written
    if (writeErrors.length > 0 && txHashes.length === 0) {
      // All writes failed
      debug('main', '❌ All attestation writes failed');
      const elapsed = Date.now() - startTime;

      // Use already-derived issuer information
      const signerInfo = `${issuerType}: ${issuerAddress}`;

      return NextResponse.json({
        ok: false,
        status: 'failed',
        error: 'Failed to write attestations to blockchain',
        details: writeErrors,
        attestations: { present, missing },
        ...(isDebugMode && {
          debug: {
            did,
            didHash: ethers.id(did),
            connectedAddress,
            activeChain: activeChain.name,
            chainId: activeChain.chainId,
            resolverAddress: activeChain.contracts.resolver,
            signerInfo,
            contractAddresses: {
              registry: activeChain.contracts.registry,
              metadata: activeChain.contracts.metadata,
              resolver: activeChain.contracts.resolver,
            }
          }
        }),
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
      ...(isDebugMode && {
        debug: {
          did,
          didHash: ethers.id(did),
          currentOwnerAfter,
          issuerAddress,
          issuerType,
          contractAddresses: {
            registry: activeChain.contracts.registry,
            metadata: activeChain.contracts.metadata,
            resolver: activeChain.contracts.resolver,
          },
          chainInfo: {
            name: activeChain.name,
            chainId: activeChain.chainId,
            rpc: activeChain.rpc,
          }
        }
      }),
      elapsed: `${elapsed}ms`,
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;
    debug('main', '❌ UNHANDLED ERROR:', error);

    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json({
      ok: false,
      status: 'failed',
      error: 'Internal server error',
      ...(isDebugMode && {
        details: errorMsg,
        stack: errorStack?.split('\n').slice(0, 10).join('\n'),
        debug: {
          issuerAddress,
          issuerType,
          activeChain: activeChain?.name,
        }
      }),
      elapsed: `${elapsed}ms`,
    }, { status: 500 });
  }
}
