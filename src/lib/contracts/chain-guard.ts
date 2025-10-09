import { defineChain } from 'thirdweb/chains';
import { env } from '@/config/env';

/**
 * Normalize various chainId shapes into a number.
 * Supports numeric and CAIP-2 (eip155:<id>) strings.
 */
export function normalizeChainId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    // CAIP-2: eip155:<id>
    const caipMatch = value.match(/^eip155:(\d+)$/i);
    if (caipMatch) {
      const parsed = parseInt(caipMatch[1], 10);
      return Number.isFinite(parsed) ? parsed : null;
    }

    // Plain numeric string
    const asNum = Number(value);
    if (Number.isInteger(asNum) && asNum > 0) return asNum;
  }

  return null;
}

/**
 * Attempt to switch the connected wallet/account to the env chain.
 * Uses thirdweb chain definition when possible; falls back to EIP-1193 if exposed.
 */
export async function ensureWalletOnEnvChain(account: any): Promise<void> {
  const desired = env.chainId;
  // Account may expose its chain id in different shapes; try to derive it if present
  const currentChainIdRaw = account && (account.chainId ?? (account.chain && account.chain.id) ?? null);
  const current = normalizeChainId(currentChainIdRaw);
  if (current === desired) return;

  // Try Thirdweb chain switching via wallet-provider request (EIP-1193)
  const hexChainId = '0x' + desired.toString(16);

  // Only use the connected account's provider; never fall back to window.ethereum
  const provider = account && account.wallet &&
    typeof account.wallet.getPersonalWallet === 'function' &&
    account.wallet.getPersonalWallet() &&
    typeof account.wallet.getPersonalWallet().getEthereumProvider === 'function'
      ? account.wallet.getPersonalWallet().getEthereumProvider()
      : null;

  if (provider && typeof provider.request === 'function') {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
      return;
    } catch (switchErr: any) {
      // If the chain is unknown, attempt to add it then switch
      if (switchErr?.code === 4902 || /Unrecognized chain ID|not added/i.test(String(switchErr?.message || ''))) {
        try {
          const chain = defineChain({
            id: env.activeChain.id,
            rpc: env.activeChain.rpc,
            name: env.activeChain.name,
            nativeCurrency: env.activeChain.nativeCurrency,
            blockExplorers: env.activeChain.blockExplorers,
          });
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: hexChainId,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: Array.isArray(chain.rpc) ? chain.rpc : [chain.rpc],
              blockExplorerUrls: (chain.blockExplorers || []).map((b: any) => b.url).filter(Boolean),
            }],
          });
          await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] });
          return;
        } catch (addErr) {
          // fall through to throw below
        }
      }
    }
  }

  // If we reach here, we couldn't switch via provider (likely in-app wallet or social login)
  // This is OK - thirdweb's sendTransaction will handle chain switching internally
  // or prompt the user as needed. Only log a warning for debugging.
  console.warn(
    `[chain-guard] Could not pre-switch wallet to chain ${desired}. ` +
    `Will proceed and let thirdweb handle chain switching.`
  );
}


