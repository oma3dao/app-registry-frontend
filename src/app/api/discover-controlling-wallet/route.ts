/**
 * Discover Controlling Wallet Endpoint
 * 
 * Discovers the controlling wallet (owner/admin) of a smart contract
 * without verifying ownership. Used for the onchain transfer method.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getRpcUrl, withRetry } from '@/lib/rpc';

export const runtime = 'nodejs';

function debug(message: string, data?: any) {
  console.log(`[discover-controlling-wallet] ${message}`, data || '');
}

/**
 * Parse did:pkh to extract chain ID and contract address
 */
function parseDid(did: string): { chainId: number; contractAddress: string } | null {
  if (!did.startsWith('did:pkh:')) {
    return null;
  }

  const caip10 = did.replace('did:pkh:', '');
  const parts = caip10.split(':');

  if (parts.length !== 3) {
    return null;
  }

  const [namespace, reference, address] = parts;

  if (namespace !== 'eip155') {
    return null; // Only EVM supported for now
  }

  const chainId = parseInt(reference, 10);
  if (isNaN(chainId)) {
    return null;
  }

  return {
    chainId,
    contractAddress: address,
  };
}

/**
 * Try to discover the controlling wallet using various methods
 */
async function discoverControllingWallet(
  chainId: number,
  contractAddress: string
): Promise<string | null> {
  const rpcUrl = getRpcUrl(chainId);
  debug(`Using RPC: ${rpcUrl}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Try multiple ownership patterns
  const patterns = [
    { name: 'owner()', sig: 'function owner() view returns (address)' },
    { name: 'admin()', sig: 'function admin() view returns (address)' },
    { name: 'getOwner()', sig: 'function getOwner() view returns (address)' },
  ];

  for (const pattern of patterns) {
    try {
      debug(`Trying pattern: ${pattern.name}`);
      const contract = new ethers.Contract(contractAddress, [pattern.sig], provider);
      const ownerAddress = await withRetry(() => contract[pattern.name.replace('()', '')]());

      debug(`Owner from ${pattern.name}: ${ownerAddress}`);

      if (ownerAddress && ownerAddress !== '0x0000000000000000000000000000000000000000') {
        return ownerAddress;
      }
    } catch (error) {
      debug(`Pattern ${pattern.name} failed:`, error);
    }
  }

  // Try EIP-1967 proxy admin slot
  try {
    debug('Trying EIP-1967 admin slot');
    const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
    const adminValue = await provider.getStorage(contractAddress, adminSlot);
    
    if (adminValue && adminValue !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      const adminAddress = ethers.getAddress('0x' + adminValue.slice(-40));
      debug(`Admin from EIP-1967: ${adminAddress}`);

      if (adminAddress !== '0x0000000000000000000000000000000000000000') {
        return adminAddress;
      }
    }
  } catch (error) {
    debug('EIP-1967 check failed:', error);
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { did } = body;

    debug('Request:', { did });

    if (!did || typeof did !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'DID is required' },
        { status: 400 }
      );
    }

    // Parse DID
    const parsed = parseDid(did);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: 'Invalid did:pkh format' },
        { status: 400 }
      );
    }

    const { chainId, contractAddress } = parsed;
    debug(`Chain ID: ${chainId}, Contract: ${contractAddress}`);

    // Discover controlling wallet
    const controllingWallet = await discoverControllingWallet(chainId, contractAddress);

    if (!controllingWallet) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Could not discover controlling wallet. Contract may not have standard ownership functions (owner, admin, getOwner, or EIP-1967 proxy).',
        },
        { status: 404 }
      );
    }

    debug(`✅ Discovered controlling wallet: ${controllingWallet}`);

    return NextResponse.json({
      ok: true,
      controllingWallet,
      chainId,
      contractAddress,
    });
  } catch (error) {
    debug('❌ ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
