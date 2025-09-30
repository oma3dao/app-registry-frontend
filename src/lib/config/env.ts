import { z } from 'zod';

const Env = z.object({
  NEXT_PUBLIC_CHAIN_ID: z.string().regex(/^\d+$/).optional(),
  NEXT_PUBLIC_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_USE_LEGACY: z.enum(['true', 'false']).default('true'),
  NEXT_PUBLIC_REGISTRY_ADDRESS_LEGACY: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  NEXT_PUBLIC_REGISTRY_ADDRESS_NEW: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  NEXT_PUBLIC_DEBUG_ADAPTER: z.enum(['true', 'false']).optional(),
});

const parsed = Env.parse({
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_USE_LEGACY: process.env.NEXT_PUBLIC_USE_LEGACY ?? 'true',
  NEXT_PUBLIC_REGISTRY_ADDRESS_LEGACY: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS_LEGACY,
  NEXT_PUBLIC_REGISTRY_ADDRESS_NEW: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS_NEW,
  NEXT_PUBLIC_DEBUG_ADAPTER: process.env.NEXT_PUBLIC_DEBUG_ADAPTER,
});

export const env = {
  ...parsed,
  chainId: parsed.NEXT_PUBLIC_CHAIN_ID ? Number(parsed.NEXT_PUBLIC_CHAIN_ID) : undefined,
  debugAdapter: parsed.NEXT_PUBLIC_DEBUG_ADAPTER === 'true',
};
