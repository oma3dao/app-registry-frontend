import { getContract, readContract, sendTransaction, prepareContractCall } from "thirdweb";
import { OMA3_APP_REGISTRY } from "@/config/contracts";
import { client } from "@/app/client";
import type { NFT } from "@/types/nft";
import { Account } from "thirdweb/wallets";
import {
  MAX_URL_LENGTH,
  MAX_DID_LENGTH,
  MAX_NAME_LENGTH,
  validateVersion,
  validateUrl,
  validateDid,
  validateName,
  validateCaipAddress
} from "@/lib/validation";

/**
 * App type representing the contract's App struct
 */
type ContractApp = {
  name: string | { _hex: string } | any;
  version: string | { _hex: string } | { major: number; minor: number; patch: number } | any;
  did: string;
  dataUrl: string;
  iwpsPortalUri: string;
  agentApiUri: string;
  contractAddress: string;
  minter: string;
  status: number;
  hasContract: boolean;
  // tokenId is no longer needed since we'll use DID as the primary identifier
};

/**
 * Helper function to convert bytes32 hex string to regular string
 * @param hex The hex string to convert
 * @returns Decoded string with null bytes removed
 */
function hexToString(hex: string | { _hex: string } | any): string {
  try {
    if (typeof hex === 'string' && hex.startsWith('0x')) {
      return Buffer.from(hex.slice(2), 'hex').toString().replace(/\0/g, '');
    } else if (typeof hex === 'object' && hex?._hex) {
      return Buffer.from(hex._hex.slice(2), 'hex').toString().replace(/\0/g, '');
    }
    return String(hex || '');
  } catch (e) {
    console.error("Error converting hex to string:", e);
    return '';
  }
}

/**
 * Convert raw app data from contract to a standardized ContractApp object
 * @param appData Raw app data from contract (array format)
 * @param index Index for debugging
 * @param defaultMinter Optional default minter address
 * @returns Formatted ContractApp object or null if invalid
 */
function parseRawAppData(appData: any[], index: number, defaultMinter: string = ''): ContractApp | null {
  if (!Array.isArray(appData) || appData.length < 3) {
    console.error(`App data at index ${index} is not in expected format:`, appData);
    return null;
  }
  
  try {
    // Process name (bytes32)
    const name = hexToString(appData[0]) || `App ${index}`;
    
    // Process version (bytes32)
    const version = hexToString(appData[1]) || "0.0.1";
    
    // Process DID
    console.log(`Raw DID value at index ${index}:`, appData[2], "type:", typeof appData[2]);
    const did = String(appData[2] || "");
    if (!did) {
      console.warn(`App ${index} has no DID, skipping`);
      return null;
    }
    
    // Create ContractApp object with all fields
    return {
      did: did,
      name: name,
      version: version,
      dataUrl: String(appData[3] || ""),
      iwpsPortalUri: String(appData[4] || ""),
      agentApiUri: String(appData[5] || ""),
      contractAddress: String(appData[6] || ""),
      minter: String(appData[7] || defaultMinter),
      status: typeof appData[8] === 'number' ? appData[8] : 0,
      hasContract: Boolean(appData[9])
    };
  } catch (error) {
    console.error(`Error processing app ${index}:`, error);
    return null;
  }
}

/**
 * Helper function to process app arrays from contract responses
 * @param apps Array of app objects from the contract
 * @returns Processed array of NFT objects
 */
function processAppArray(apps: ContractApp[]): NFT[] {
  console.log("Processing apps array, length:", apps.length);
  
  if (!apps || apps.length === 0) {
    console.log("No apps to process");
    return [];  
  }
  
  // Map apps to NFT objects
  return apps.map((app: ContractApp, index: number) => {
    try {
      // Skip if no DID
      if (!app.did) {
        console.warn(`App ${index} has no DID, skipping`);
        return null;
      }
      
      console.log(`Extracted name: "${app.name}", version: "${app.version}", did: "${app.did}" for app ${index}`);
      
      // Construct and return the NFT object using DID as the primary identifier
      return {
        did: app.did,
        name: app.name || `App ${index}`,
        dataUrl: app.dataUrl || "",
        iwpsPortalUri: app.iwpsPortalUri || "",
        agentPortalUri: app.agentApiUri || "",
        contractAddress: app.contractAddress || "",
        version: app.version || "0.0.1",
        status: typeof app.status === 'number' ? app.status : 0,
        minter: app.minter || ""
      };
    } catch (mappingError) {
      console.error(`Error mapping app with DID ${app.did || "unknown"}:`, mappingError);
      return null;
    }
  }).filter(Boolean) as NFT[]; // Remove any null entries
}

/**
 * Process any contract response into standardized ContractApp array
 * @param response Raw response from contract
 * @param defaultMinter Optional default minter address for data filling
 * @returns Object containing app array and next index for pagination
 */
function processContractResponse(response: any, defaultMinter: string = ''): { apps: ContractApp[], nextIndex: number } {
  if (!response) {
    console.log("Response is null or undefined");
    return { apps: [], nextIndex: 0 };
  }
  
  console.log("Raw contract response:", response);
  let apps: ContractApp[] = [];
  let nextIndex = 0;
  
  // For debugging and data inspection
  if (Array.isArray(response)) {
    console.log("Response is an array with length:", response.length);
    
    // Plain array of raw app data - each item is a complete app
    if (response.length > 0 && Array.isArray(response[0]) && response[0].length >= 3) {
      console.log("Processing raw array of app data");
      
      apps = response.map((appData, index) => 
        parseRawAppData(appData, index, defaultMinter)
      ).filter(Boolean) as ContractApp[];
    } 
    // Case 1: getApps response - array with two elements [apps[], nextIndex]
    else if (response.length === 2 && Array.isArray(response[0]) && (typeof response[1] === 'number' || typeof response[1] === 'bigint')) {
      console.log("Found getApps response with pagination");
      const appsData = response[0];
      nextIndex = typeof response[1] === 'bigint' ? Number(response[1]) : response[1];
      
      // Process each app in the apps array
      apps = appsData.map((appData, index) => 
        Array.isArray(appData) ? parseRawAppData(appData, index, defaultMinter) : appData as ContractApp
      ).filter(Boolean) as ContractApp[];
    }
    // Case 2: getAppsByMinter response - array with one element [apps[]]
    else if (response.length === 1 && Array.isArray(response[0])) {
      console.log("Found getAppsByMinter response");
      const appData = response[0];
      
      // Handle array of raw app data vs array of app objects
      if (Array.isArray(appData) && appData.length > 0) {
        // If first element is array, then it's array of app data
        if (Array.isArray(appData[0])) {
          console.log("Found array of arrays structure");
          apps = appData.map((innerAppData, index) => 
            parseRawAppData(innerAppData, index, defaultMinter)
          ).filter(Boolean) as ContractApp[];
        }
        // If first element is not an array, then it's a single app in raw format
        else if (appData.length >= 10) {
          console.log("Found single app data array");
          const app = parseRawAppData(appData, 0, defaultMinter);
          if (app) apps = [app];
        }
      }
    }
    // Case 3: Plain array of app objects (fallback)
    else {
      console.log("Found plain array response, treating as array of ContractApp objects");
      apps = response as ContractApp[];
    }
  }
  // Case 4: Object with 'apps' property
  else if (typeof response === 'object' && response !== null && 'apps' in response) {
    const responseWithApps = response as { apps: any[] };
    if (Array.isArray(responseWithApps.apps)) {
      console.log("Found apps in object property");
      apps = responseWithApps.apps as ContractApp[];
    }
  }
  
  console.log(`Extracted ${apps.length} apps with nextIndex ${nextIndex}`);
  return { apps, nextIndex };
}

/**
 * Gets the contract instance for the OMA3AppRegistry
 * @returns The contract instance
 */
export function getAppRegistryContract() {
  try {
    console.log("Creating contract with parameters:", {
      address: OMA3_APP_REGISTRY.address,
      chainId: OMA3_APP_REGISTRY.chain.id,
    });
    
    if (!client) {
      console.error("Thirdweb client is not initialized");
      throw new Error("Thirdweb client is not initialized");
    }
    
    console.log("Thirdweb client initialized successfully:", !!client);
    
    return getContract({
      client,
      chain: OMA3_APP_REGISTRY.chain,
      address: OMA3_APP_REGISTRY.address,
      abi: OMA3_APP_REGISTRY.abi,
    });
  } catch (error) {
    console.error("Failed to get contract instance:", error);
    throw error;
  }
}

/**
 * Get all registered applications from the contract
 * Automatically handles pagination behind the scenes
 * @returns Array of registered NFTs
 */
export async function getApps(): Promise<NFT[]> {
  // Internal implementation with pagination
  return getAppsWithPagination();
}

/**
 * Internal function that handles pagination logic
 * @param startIndex Optional starting index for pagination (default is 1)
 * @param maxResults Optional maximum number of results to return (default is 100)
 * @returns Array of registered NFTs
 */
export async function getAppsWithPagination(startIndex: number = 1, maxResults: number = 100): Promise<NFT[]> {
  try {
    console.log(`Getting App Registry contract (pagination, startIndex: ${startIndex}, maxResults: ${maxResults})...`);
    const contract = getAppRegistryContract();
    console.log("Contract obtained:", contract);
    
    // Initialize results array and current index
    let allApps: NFT[] = [];
    let currentIndex = BigInt(startIndex);
    let hasMoreApps = true;
    let requestCount = 0;
    const MAX_REQUESTS = 10; // Safety limit for API calls
    
    // Loop to fetch all apps with pagination
    while (hasMoreApps && allApps.length < maxResults && requestCount < MAX_REQUESTS) {
      console.log(`Calling readContract for getApps with index ${currentIndex}...`);
      
      try {
        // Using readContract from thirdweb v5 with proper type casting
        const getAppsString = "function getApps(uint256) view returns ((bytes32, bytes32, string, string, string, string, string, address, uint8, bool)[], uint256)";
        const result = await readContract({
          contract: contract,
          method: getAppsString,
          params: [currentIndex],
        });
        
        // Extract apps array and next index from the response
        const { apps, nextIndex } = processContractResponse(result);
        
        // Process the apps array
        const processedApps = processAppArray(apps);
        allApps = [...allApps, ...processedApps];
        
        console.log(`Fetched ${processedApps.length} apps, next index: ${nextIndex}`);
        
        // Update pagination state
        if (nextIndex > 0) {
          currentIndex = BigInt(nextIndex);
          requestCount++;
        } else {
          hasMoreApps = false;
        }
      } catch (readError) {
        console.error("Error during contract read:", readError);
        hasMoreApps = false;
      }
    }
    
    console.log(`Finished fetching apps. Total apps: ${allApps.length}`);
    return allApps.slice(0, maxResults);
  } catch (error) {
    console.error("Error fetching apps:", error);
    // Return empty array instead of throwing to prevent app from crashing
    return [];
  }
}

/**
 * Get applications registered by a specific minter address
 * @param minterAddress The address of the minter to filter by
 * @returns Array of registered NFTs created by the specified minter
 */
export async function getAppsByMinter(minterAddress: string): Promise<NFT[]> {
  try {
    console.log("Getting App Registry contract...");
    const contract = getAppRegistryContract();
    console.log("Contract obtained:", contract);
    
    console.log(`Calling readContract for getAppsByMinter with address: ${minterAddress}...`);
    
    try {
      // Using readContract from thirdweb v5 with proper type casting
      const getAppsByMinterString = "function getAppsByMinter(address) view returns ((bytes32, bytes32, string, string, string, string, string, address, uint8, bool)[])";
      const result = await readContract({
        contract: contract,
        method: getAppsByMinterString,
        params: [minterAddress],
      });
      
      console.log("Raw result from getAppsByMinter:", result);
      
      // Process the response using our unified function
      const { apps } = processContractResponse(result, minterAddress);
      const processedApps = processAppArray(apps);
      
      console.log(`Processed ${processedApps.length} apps`);
      return processedApps;
    } catch (readError) {
      console.error("Error during contract read:", readError);
      return [];
    }
    
  } catch (error) {
    console.error("Error fetching apps by minter:", error);
    // Return empty array instead of throwing to prevent app from crashing
    return [];
  }
}

/**
 * Get the total number of registered apps
 * @returns Total number of apps registered in the contract
 */
export async function getTotalApps(): Promise<number> {
  try {
    console.log("Getting total registered apps count...");
    const contract = getAppRegistryContract();
    
    try {
      // Using readContract from thirdweb v5 to call getTotalApps function
      const getTotalAppsString = "function getTotalApps() view returns (uint256)";
      const result = await readContract({
        contract: contract,
        method: getTotalAppsString,
        params: [],
      });
      
      console.log("Total apps count from contract:", result);
      
      // Convert BigInt to number for easier usage
      const totalApps = typeof result === 'bigint' ? Number(result) : 0;
      return totalApps;
    } catch (readError) {
      console.error("Error getting total apps count:", readError);
      return 0;
    }
  } catch (error) {
    console.error("Error getting total apps count:", error);
    return 0;
  }
}

/**
 * Register a new application on the blockchain by minting an NFT
 * @param nft The NFT data to register
 * @param account The connected wallet account
 * @returns The registered NFT with its assigned DID
 */
export async function mint(nft: NFT, account: Account): Promise<NFT> {
  try {
    // Validate name
    if (!validateName(nft.name)) {
      throw new Error(`Invalid name: ${nft.name}. Name must be between 1 and ${MAX_NAME_LENGTH} characters.`);
    }
    
    // Validate version format
    if (!validateVersion(nft.version)) {
      throw new Error(`Invalid version format: ${nft.version}. Version must be in the format x.y.z or x.y where x, y, and z are numbers.`);
    }
    
    // Validate DID
    if (!validateDid(nft.did)) {
      throw new Error(`Invalid DID format: ${nft.did}. DID must follow the pattern did:method:id and not exceed ${MAX_DID_LENGTH} characters.`);
    }
    
    // Validate URLs
    const validateContractUrl = (url: string, fieldName: string) => {
      if (!validateUrl(url)) {
        throw new Error(`Invalid ${fieldName}: ${url}. URL must be a valid format and not exceed ${MAX_URL_LENGTH} characters.`);
      }
    };
    
    validateContractUrl(nft.dataUrl, "Data URL");
    validateContractUrl(nft.iwpsPortalUri, "IWPS Portal URI");
    validateContractUrl(nft.agentPortalUri, "Agent Portal URI");
    
    // Optional CAIP address validation
    if (nft.contractAddress && !validateCaipAddress(nft.contractAddress)) {
      throw new Error(`Invalid contract address format: ${nft.contractAddress}`);
    }
    
    const contract = getAppRegistryContract();
    
    // Debug contract instance
    console.log("Contract instance:", contract);
    console.log("Contract type:", typeof contract);
    console.log("Contract keys:", Object.keys(contract));
    
    // Convert string name to bytes32 (required by contract)
    const nameBytes32 = ('0x' + Buffer.from(nft.name.padEnd(32, '\0')).toString('hex')) as `0x${string}`;
    
    // Convert version string to bytes32 (required by contract)
    const versionBytes32 = ('0x' + Buffer.from(nft.version.padEnd(32, '\0')).toString('hex')) as `0x${string}`;
    
    console.log("Minting app with parameters:", {
      did: nft.did,
      name: nameBytes32,
      version: versionBytes32,
      dataUrl: nft.dataUrl,
      iwpsPortalUri: nft.iwpsPortalUri,
      agentApiUri: nft.agentPortalUri,
      contractAddress: nft.contractAddress || ""
    });
    
    try {
      console.log("Preparing contract call for mint function");
      console.log("Contract chain ID:", contract.chain?.id);
      
      // Prepare the contract call
      const transaction = prepareContractCall({
        contract,
        method: "function mint(string, bytes32, bytes32, string, string, string, string) returns (bool)",
        params: [
          nft.did,                // string did
          nameBytes32,            // bytes32 name
          versionBytes32,         // bytes32 version
          nft.dataUrl,            // string dataUrl
          nft.iwpsPortalUri,      // string iwpsPortalUri
          nft.agentPortalUri,     // string agentApiUri
          nft.contractAddress || "" // string contractAddress
        ]
      });
      
      console.log("Transaction prepared:", {
        to: transaction.to,
        value: transaction.value?.toString() || '0',
        data: typeof transaction.data === 'string' ? 
          `${transaction.data.slice(0, 66)}...` : 
          'Function that returns data'
      });
      
      console.log("Using sendTransaction with account:", {
        address: account.address
      });
      
      // This is the recommended approach using ThirdWeb's v5 transaction pattern
      const { transactionHash } = await sendTransaction({
        account,
        transaction
      });
      
      console.log("Transaction sent successfully with hash:", transactionHash);
      console.log(`Successfully minted app with DID: ${nft.did}`);
      
      // Return the NFT object as-is - the contract will handle status assignment
      return nft;
    } catch (mintError) {
      console.error("Error during sendTransaction:", mintError);
      
      // Safely extract error information
      const errorMessage = mintError instanceof Error ? mintError.message : String(mintError);
      const errorName = mintError instanceof Error ? mintError.constructor.name : 'Unknown';
      
      console.error("Error type:", errorName);
      console.error("Error message:", errorMessage);
      
      // For common transaction errors, provide more context
      if (errorMessage.includes("user rejected")) {
        console.error("User rejected the transaction in their wallet");
      } else if (errorMessage.includes("insufficient funds")) {
        console.error("Wallet has insufficient funds to complete the transaction");
      } else if (errorMessage.includes("nonce")) {
        console.error("Nonce issue - there might be pending transactions");
      }
      
      console.error("Error details:", JSON.stringify(mintError, null, 2));
      throw mintError;
    }
  } catch (error) {
    console.error("Error minting app:", error);
    throw error;
  }
}

/**
 * Wrapper function for minting a new application
 * @param nft The NFT data to register
 * @param account The connected wallet account
 * @returns The registered NFT
 */
export async function registerApp(nft: NFT, account: Account): Promise<NFT> {
  return mint(nft, account);
}

/**
 * Update an application status on the blockchain
 * @param nft The NFT with status to update, identified by DID
 * @param account The connected wallet account
 * @returns The updated NFT
 */
export async function updateStatus(nft: NFT, account: Account): Promise<NFT> {
  try {
    // Validate DID
    if (!validateDid(nft.did)) {
      throw new Error(`Invalid DID format: ${nft.did}. DID must follow the pattern did:method:id and not exceed ${MAX_DID_LENGTH} characters.`);
    }
    
    // Validate status
    if (typeof nft.status !== 'number' || nft.status < 0 || nft.status > 2) {
      const errorMsg = `Invalid status value: ${nft.status}. Status must be 0 (Active), 1 (Deprecated), or 2 (Replaced).`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log(`Updating status for app with DID: ${nft.did} to status: ${nft.status}`);
    console.log(`Status value type: ${typeof nft.status}`);
    
    const contract = getAppRegistryContract();
    
    try {
      // Prepare the contract call
      const transaction = prepareContractCall({
        contract,
        method: "function updateStatus(string, uint8) returns (bool)",
        params: [
          nft.did,
          nft.status
        ]
      });
      
      console.log("Transaction prepared:", {
        to: transaction.to,
        method: "updateStatus",
        params: [nft.did, nft.status]
      });
      
      // Additional logging before wallet interaction
      console.log("Account address used for transaction:", account.address);
      console.log("About to send transaction - wallet signing dialog should appear now");
      
      // Send the transaction with the provided account
      const { transactionHash } = await sendTransaction({
        account,
        transaction
      });
      
      console.log(`Successfully updated status for app with DID: ${nft.did}, transaction hash: ${transactionHash}`);
      
      // Return the updated NFT
      return nft;
    } catch (updateError) {
      console.error("Error during status update transaction:", updateError);
      console.error("Error details:", JSON.stringify(updateError, null, 2));
      throw updateError;
    }
  } catch (error) {
    console.error("Error updating app status:", error);
    throw error;
  }
}