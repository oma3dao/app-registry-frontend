'use client';

/**
 * React hooks for OMA3AppMetadataV0 contract interactions (Phase 0)
 */

import { useState, useEffect, useCallback } from 'react';
import { sendTransaction } from 'thirdweb';
import { useActiveAccount } from 'thirdweb/react';
import type { NFT } from "@/types/nft";
import type { MetadataContractData } from '@/types/metadata-contract';
import { getMetadata } from './metadata.read';
import { prepareSetMetadata } from './metadata.write';
import { formatErrorMessage } from './errors';

/**
 * Hook to get metadata for a versioned DID
 * @param versionedDid The versioned DID to fetch metadata for
 * @returns Metadata, loading state, error, and refetch function
 */
export function useMetadata(versionedDid?: string) {
  const [data, setData] = useState<MetadataContractData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetadata = useCallback(async () => {
    if (!versionedDid) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getMetadata(versionedDid);
      setData(result);
    } catch (e) {
      setError(new Error(formatErrorMessage(e)));
    } finally {
      setIsLoading(false);
    }
  }, [versionedDid]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return { data, isLoading, error, refetch: fetchMetadata };
}

/**
 * Hook to set metadata for an app
 * @returns Set metadata function, pending state, and error
 */
export function useSetMetadata() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const account = useActiveAccount();

  const setMetadata = useCallback(async (nft: NFT): Promise<boolean> => {
    if (!account) {
      throw new Error('No wallet connected');
    }

    setIsPending(true);
    setError(null);

    try {
      const transaction = prepareSetMetadata(nft);
      
      await sendTransaction({
        account,
        transaction
      });
      
      return true;
    } catch (e) {
      const err = new Error(formatErrorMessage(e));
      setError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, [account]);

  return { setMetadata, isPending, error };
}
