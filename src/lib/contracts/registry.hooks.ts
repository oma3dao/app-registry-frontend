/**
 * React hooks for OMA3 App Registry contract interactions
 * These hooks wrap the pure functions and provide React-friendly state management
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { sendTransaction } from 'thirdweb';
import { useActiveAccount } from 'thirdweb/react';
import {
  getAppByDid,
  getAppsByOwner,
  listApps,
  getTotalApps,
  searchByDid,
} from './registry.read';
import { prepareMintApp, prepareUpdateStatus } from './registry.write';
import { normalizeEvmError, formatErrorMessage } from './errors';
import { ensureWalletOnEnvChain } from './chain-guard';
import type { AppSummary, Status, MintAppInput, Paginated } from './types';

/**
 * Hook to fetch a single app by DID
 * @param did The DID of the app to fetch
 * @returns App data, loading state, and error
 */
export function useApp(did?: string) {
  const [data, setData] = useState<AppSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!did) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    getAppByDid(did)
      .then(setData)
      .catch((e) => {
        setError(new Error(formatErrorMessage(e)));
      })
      .finally(() => setIsLoading(false));
  }, [did]);

  return { data, isLoading, error, refetch: () => did && getAppByDid(did).then(setData) };
}

/**
 * Hook to fetch apps by owner address
 * @param owner The owner address
 * @returns Array of apps, loading state, and error
 */
export function useAppsByOwner(owner?: `0x${string}`) {
  const [data, setData] = useState<AppSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!owner) {
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    getAppsByOwner(owner)
      .then(setData)
      .catch((e) => {
        setError(new Error(formatErrorMessage(e)));
      })
      .finally(() => setIsLoading(false));
  }, [owner]);

  return { data, isLoading, error };
}

/**
 * Hook to list apps with pagination
 * @param startIndex Starting index for pagination
 * @param pageSize Number of apps per page
 * @returns Paginated apps, loading state, and error
 */
export function useAppsList(startIndex: number = 1, pageSize: number = 20) {
  const [data, setData] = useState<Paginated<AppSummary>>({ items: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchApps = useCallback(() => {
    setIsLoading(true);
    setError(null);

    listApps(startIndex, pageSize)
      .then((result) => {
        setData(result);
      })
      .catch((e) => {
        setError(new Error(formatErrorMessage(e)));
      })
      .finally(() => setIsLoading(false));
  }, [startIndex, pageSize]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  return { data, isLoading, error, refetch: fetchApps };
}

/**
 * Hook to get total apps count
 * @returns Total apps count, loading state, and error
 */
export function useTotalApps() {
  const [data, setData] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    getTotalApps()
      .then((result) => {
        setData(result);
      })
      .catch((e) => {
        setError(new Error(formatErrorMessage(e)));
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading, error };
}

/**
 * Hook to mint/register a new app
 * @returns Mint function, pending state, and error
 */
export function useMintApp() {
  const account = useActiveAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const mint = async (input: MintAppInput): Promise<string> => {
    if (!account) {
      throw new Error('No active account. Please connect your wallet.');
    }

    setIsPending(true);
    setError(null);
    setTxHash(null);

    const sendOnce = async () => {
      await ensureWalletOnEnvChain(account);
      const transaction = prepareMintApp(input);
      const result = await sendTransaction({ account, transaction });
      setTxHash(result.transactionHash);
      return result.transactionHash;
    };

    try {
      return await sendOnce();
    } catch (e) {
      const normalized = normalizeEvmError(e);
      if (normalized.code === 'NETWORK_ERROR') {
        // brief delay then retry once after re-ensuring chain
        await new Promise((r) => setTimeout(r, 300));
        try {
          return await sendOnce();
        } catch (e2) {
          const n2 = normalizeEvmError(e2);
          const err2 = new Error(n2.message);
          setError(err2);
          throw err2;
        }
      }
      const errorObj = new Error(normalized.message);
      setError(errorObj);
      throw errorObj;
    } finally {
      setIsPending(false);
    }
  };

  return { mint, isPending, error, txHash };
}

/**
 * Hook to update an app's status
 * @returns Update function, pending state, and error
 */
export function useUpdateStatus() {
  const account = useActiveAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const updateStatus = async (did: string, status: Status): Promise<string> => {
    if (!account) {
      throw new Error('No active account. Please connect your wallet.');
    }

    setIsPending(true);
    setError(null);
    setTxHash(null);

    const sendOnce = async () => {
      await ensureWalletOnEnvChain(account);
      // Get the app to determine the major version
      const app = await getAppByDid(did);
      if (!app) {
        throw new Error(`App not found: ${did}`);
      }
      
      const transaction = prepareUpdateStatus({
        did,
        major: app.versionMajor,
        status,
      });
      const result = await sendTransaction({ account, transaction });
      setTxHash(result.transactionHash);
      return result.transactionHash;
    };

    try {
      return await sendOnce();
    } catch (e) {
      const normalized = normalizeEvmError(e);
      if (normalized.code === 'NETWORK_ERROR') {
        await new Promise((r) => setTimeout(r, 300));
        try {
          return await sendOnce();
        } catch (e2) {
          const n2 = normalizeEvmError(e2);
          const err2 = new Error(n2.message);
          setError(err2);
          throw err2;
        }
      }
      const errorObj = new Error(normalized.message);
      setError(errorObj);
      throw errorObj;
    } finally{
      setIsPending(false);
    }
  };

  return { updateStatus, isPending, error, txHash };
}

/**
 * Hook to search apps by DID
 * @param query Search query (DID)
 * @returns Search results, loading state, and error
 */
export function useSearchByDid(query?: string) {
  const [data, setData] = useState<AppSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query || query.trim() === '') {
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    searchByDid(query)
      .then(setData)
      .catch((e) => {
        setError(new Error(formatErrorMessage(e)));
      })
      .finally(() => setIsLoading(false));
  }, [query]);

  return { data, isLoading, error };
}
