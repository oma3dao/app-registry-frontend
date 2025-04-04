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
 * Helper function to process app arrays from contract responses
 * @param apps Array of app objects from the contract
 * @returns Processed array of NFT objects
 */
function processAppArray(apps: ContractApp[]): NFT[] {
  console.log("Processing apps array, length:", apps.length);
  console.log("Apps to process:", JSON.stringify(apps, null, 2));
  
  if (!apps || apps.length === 0) {
    console.log("No apps to process");
    return [];  
  }
  
  // Map apps to NFT objects
  return apps.map((app: ContractApp, index: number) => {
    try {
      console.log(`Processing app ${index}:`, app);
      
      // Extract name (handle both string and bytes32 formats)
      let name = "";
      if (app.name) {
        if (typeof app.name === 'string') {
          name = app.name;
          // If it's a hex string, convert it
          if (name.startsWith('0x')) {
            name = Buffer.from(name.slice(2), 'hex').toString().replace(/\0/g, '');
          }
        } else if (typeof app.name === 'object' && app.name._hex) {
          name = Buffer.from(app.name._hex.slice(2), 'hex').toString().replace(/\0/g, '');
        }
      }
      
      // Extract version (handle different formats)
      let version = "0.0.0";
      if (app.version) {
        if (typeof app.version === 'string') {
          version = app.version;
          // If it's a hex string, convert it
          if (version.startsWith('0x')) {
            version = Buffer.from(version.slice(2), 'hex').toString().replace(/\0/g, '');
          }
        } else if (typeof app.version === 'object') {
          if ('major' in app.version && 'minor' in app.version && 'patch' in app.version) {
            version = `${app.version.major || 0}.${app.version.minor || 0}.${app.version.patch || 0}`;
          } else if (app.version._hex || (typeof app.version === 'string' && app.version.startsWith('0x'))) {
            // Handle bytes32 version format
            const versionHex = app.version._hex || app.version;
            version = Buffer.from(versionHex.slice(2), 'hex').toString().replace(/\0/g, '');
          }
        }
      }
      
      console.log(`Extracted name: "${name}", version: "${version}" for app ${index}`);
      
      // Construct and return the NFT object using DID as the primary identifier
      return {
        did: app.did || "",
        name: name,
        dataUrl: app.dataUrl || "",
        iwpsPortalUri: app.iwpsPortalUri || "",
        agentPortalUri: app.agentApiUri || "",
        contractAddress: app.contractAddress || "",
        version: version
      };
    } catch (mappingError) {
      console.error(`Error mapping app with DID ${app.did || "unknown"}:`, mappingError);
      return null;
    }
  }).filter(Boolean) as NFT[]; // Remove any null entries
}

/**
 * Extract apps array from different possible response structures
 * @param response Raw response from contract
 * @returns Object containing app array and next index for pagination
 */
function extractAppsArrayWithPagination(response: any): { apps: ContractApp[], nextIndex: number } {
  if (!response) {
    console.log("Response is null or undefined");
    return { apps: [], nextIndex: 0 };
  }
  
  console.log("Raw contract response:", response);
  let apps: ContractApp[] = [];
  let nextIndex = 0;
  
  // Case 1: getApps response - array with two elements [apps[], nextIndex]
  if (Array.isArray(response) && response.length === 2 && Array.isArray(response[0]) && typeof response[1] === 'number') {
    console.log("Found getApps response with pagination");
    const appsData = response[0];
    nextIndex = response[1];
    
    // Process each app in the apps array
    apps = appsData.map(appData => {
      if (Array.isArray(appData) && appData.length >= 10) {
        return {
          name: appData[0],         // bytes32 name
          version: appData[1],      // bytes32 version
          did: appData[2],          // string did
          dataUrl: appData[3],      // string dataUrl
          iwpsPortalUri: appData[4], // string iwpsPortalUri
          agentApiUri: appData[5],  // string agentApiUri
          contractAddress: appData[6], // string contractAddress
          minter: appData[7],       // address minter
          status: appData[8],       // uint8 status
          hasContract: appData[9]   // bool hasContract
        };
      }
      return appData as ContractApp;
    });
  }
  // Case 2: getAppsByMinter response - array with one element [apps[]]
  else if (Array.isArray(response) && response.length === 1 && Array.isArray(response[0])) {
    console.log("Found getAppsByMinter response");
    const appData = response[0];
    
    // Handle array of raw app data vs array of app objects
    if (Array.isArray(appData) && appData.length > 0) {
      // If first element is array, then it's array of app data
      if (Array.isArray(appData[0])) {
        console.log("Found array of arrays structure");
        apps = appData.map(innerAppData => {
          if (Array.isArray(innerAppData) && innerAppData.length >= 10) {
            return {
              name: innerAppData[0],         // bytes32 name
              version: innerAppData[1],      // bytes32 version
              did: innerAppData[2],          // string did
              dataUrl: innerAppData[3],      // string dataUrl
              iwpsPortalUri: innerAppData[4], // string iwpsPortalUri
              agentApiUri: innerAppData[5],  // string agentApiUri
              contractAddress: innerAppData[6], // string contractAddress
              minter: innerAppData[7],       // address minter
              status: innerAppData[8],       // uint8 status
              hasContract: innerAppData[9]   // bool hasContract
            };
          }
          return innerAppData as ContractApp;
        });
      }
      // If first element is not an array, then it's a single app in raw format
      else if (appData.length >= 10) {
        console.log("Found single app data array");
        const app: ContractApp = {
          name: appData[0],         // bytes32 name
          version: appData[1],      // bytes32 version
          did: appData[2],          // string did
          dataUrl: appData[3],      // string dataUrl
          iwpsPortalUri: appData[4], // string iwpsPortalUri
          agentApiUri: appData[5],  // string agentApiUri
          contractAddress: appData[6], // string contractAddress
          minter: appData[7],       // address minter
          status: appData[8],       // uint8 status
          hasContract: appData[9]   // bool hasContract
        };
        apps = [app];
      }
    }
  }
  // Case 3: Plain array of app objects
  else if (Array.isArray(response)) {
    console.log("Found plain array response");
    apps = response as ContractApp[];
  }
  // Case 4: Object with 'apps' property
  else if (typeof response === 'object' && response !== null && 'apps' in response) {
    if (Array.isArray(response.apps)) {
      console.log("Found apps in object property");
      apps = response.apps as ContractApp[];
    }
  }
  
  console.log(`Extracted ${apps.length} apps with nextIndex ${nextIndex}`);
  return { apps, nextIndex };
}

/**
 * Simple wrapper to maintain backward compatibility
 * @param response Raw response from contract
 * @returns Array of app objects
 */
function extractAppsArray(response: any): ContractApp[] {
  const { apps } = extractAppsArrayWithPagination(response);
  return apps;
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
  return _getAppsWithPagination();
}

/**
 * Internal function that handles pagination logic
 * @param startIndex Optional starting index for pagination (default is 1)
 * @param maxResults Optional maximum number of results to return (default is 100)
 * @returns Array of registered NFTs
 */
async function _getAppsWithPagination(startIndex: number = 1, maxResults: number = 100): Promise<NFT[]> {
  try {
    console.log(`Getting App Registry contract (internal pagination, startIndex: ${startIndex}, maxResults: ${maxResults})...`);
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
        const { apps, nextIndex } = extractAppsArrayWithPagination(result);
        
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
    
    console.log("Calling readContract for getAppsByMinter...");
    
    try {
      // Using readContract from thirdweb v5 with proper type casting
      const getAppsByMinterString = "function getAppsByMinter(address) view returns ((bytes32, bytes32, string, string, string, string, string, address, uint8, bool)[])";
      const result = await readContract({
        contract: contract,
        method: getAppsByMinterString,
        params: [minterAddress],
      });
      
      // Extract apps array from the response
      const { apps } = extractAppsArrayWithPagination(result);
      
      // Process the apps array
      return processAppArray(apps);
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
      
      // Return the NFT object as-is
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
 * @returns The updated NFT
 */
export async function updateStatus(nft: NFT): Promise<NFT> {
  try {
    // Validate DID
    if (!validateDid(nft.did)) {
      throw new Error(`Invalid DID format: ${nft.did}. DID must follow the pattern did:method:id and not exceed ${MAX_DID_LENGTH} characters.`);
    }
    
    const contract = getAppRegistryContract();
    
    // The contract only supports status updates, not full app updates
    // Since our current implementation doesn't track status,
    // this is a placeholder for when we add status to the NFT type
    const status = 0; // Pending status (default)
    
    console.log(`Updating status for app with DID: ${nft.did} to status: ${status}`);
    
    try {
      // Use contract.call method with type assertion
      await (contract as any).call("updateStatus", [
        nft.did,
        status
      ]);
      
      console.log(`Successfully updated status for app with DID: ${nft.did}`);
      
      // Return the updated NFT
      return nft;
    } catch (updateError) {
      console.error("Error during contract.call for updateStatus:", updateError);
      console.error("Error details:", JSON.stringify(updateError, null, 2));
      throw updateError;
    }
  } catch (error) {
    console.error("Error updating app status:", error);
    throw error;
  }
}


