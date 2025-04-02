import { getContract, readContract } from "thirdweb";
import { OMA3_APP_REGISTRY } from "@/config/contracts";
import { client } from "@/app/client";
import type { NFT } from "@/types/nft";

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
  tokenId?: string | number;
};

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
      // Extract name (handle both string and bytes32 formats)
      let name = "";
      if (app.name) {
        if (typeof app.name === 'string') {
          name = app.name;
        } else if (typeof app.name === 'object' && app.name._hex) {
          name = Buffer.from(app.name._hex.slice(2), 'hex').toString().replace(/\0/g, '');
        } else if (typeof app.name === 'string' && app.name.startsWith('0x')) {
          name = Buffer.from(app.name.slice(2), 'hex').toString().replace(/\0/g, '');
        }
      }
      
      // Extract version (handle different formats)
      let version = "0.0.0";
      if (app.version) {
        if (typeof app.version === 'string') {
          version = app.version;
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
      
      // Construct and return the NFT object
      return {
        id: app.tokenId ? app.tokenId.toString() : index.toString(),
        name: name,
        did: app.did || "",
        dataUrl: app.dataUrl || "",
        iwpsPortalUri: app.iwpsPortalUri || "",
        agentPortalUri: app.agentApiUri || "",
        contractAddress: app.contractAddress || "",
        version: version
      };
    } catch (mappingError) {
      console.error(`Error mapping app ${index}:`, mappingError);
      return null;
    }
  }).filter(Boolean) as NFT[]; // Remove any null entries
}

/**
 * Extract apps array from different possible response structures
 * @param response Raw response from contract
 * @returns Array of app objects
 */
function extractAppsArray(response: any): ContractApp[] {
  if (!response) {
    console.log("Response is null or undefined");
    return [];
  }
  
  console.log("Raw contract response:", response);
  // Case 1: Response is an array where first element is apps array
  if (Array.isArray(response) && response.length > 0) {
    if (Array.isArray(response[0])) {
      console.log("Found apps array in first element");
      return response[0] as ContractApp[];
    } else {
      console.log("Using response array directly");
      return response as ContractApp[];
    }
  } 
  // Case 2: Response is an object with 'apps' property
  else if (typeof response === 'object' && response !== null && 'apps' in response) {
    if (Array.isArray(response.apps)) {
      console.log("Found apps in object property");
      return response.apps as ContractApp[];
    }
  }
  
  console.log("No valid apps array found in response");
  return [];
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
 * @returns Array of registered NFTs
 */
export async function getApps(): Promise<NFT[]> {
  try {
    console.log("Getting App Registry contract...");
    const contract = getAppRegistryContract();
    console.log("Contract obtained:", contract);
    
    console.log("Calling readContract for getApps...");
    
    try {
      // Using readContract from thirdweb v5 with proper type casting
      const getAppsString = "function getApps(uint256) view returns ((bytes32, bytes32, string, string, string, string, string, address, uint8, bool)[], uint256)";
      const result = await readContract({
        contract: contract,
        method: getAppsString,
        params: [BigInt(1)],
      });
      
      // Extract apps array from the response
      const appsArray = extractAppsArray(result);
      
      // Process the apps array
      return processAppArray(appsArray);
    } catch (readError) {
      console.error("Error during contract read:", readError);
      return [];
    }
    
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
      const appsArray = extractAppsArray(result);
      
      // Process the apps array
      return processAppArray(appsArray);
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
 * @returns The registered NFT with its assigned token ID
 */
export async function mint(nft: Omit<NFT, "id">): Promise<NFT> {
  try {
    const contract = getAppRegistryContract();
    
    // Convert string name to bytes32 (required by contract)
    const nameBytes32 = '0x' + Buffer.from(nft.name.padEnd(32, '\0')).toString('hex');
    
    // Convert version string to bytes32 (required by contract)
    const versionBytes32 = '0x' + Buffer.from(nft.version.padEnd(32, '\0')).toString('hex');
    
    console.log("Minting app with parameters:", {
      did: nft.did,
      name: nameBytes32,
      version: versionBytes32,
      dataUrl: nft.dataUrl,
      iwpsPortalUri: nft.iwpsPortalUri,
      agentApiUri: nft.agentPortalUri,
      contractAddress: nft.contractAddress || ""
    });
    
    // Use contract.write directly with casting
    const result = await (contract as any).write.mint([
      nft.did,                // string did
      nameBytes32,            // bytes32 name
      versionBytes32,         // bytes32 version (now a single bytes32 instead of major/minor/patch)
      nft.dataUrl,            // string dataUrl
      nft.iwpsPortalUri,      // string iwpsPortalUri
      nft.agentPortalUri,     // string agentApiUri
      nft.contractAddress || "" // string contractAddress
    ]);
    
    // Get the tokenId from the transaction receipt or event
    const events = await result.wait();
    
    // Look for the ApplicationMinted event
    const mintEvent = events.logs.find(
      (log: any) => log.fragment && log.fragment.name === "ApplicationMinted"
    );
    
    let tokenId;
    if (mintEvent && mintEvent.args.tokenId) {
      tokenId = mintEvent.args.tokenId.toString();
    } else {
      // Fallback if we can't extract the token ID from events
      tokenId = Date.now().toString();
    }
    
    // Return the NFT with its new ID
    return { ...nft, id: tokenId };
  } catch (error) {
    console.error("Error minting app:", error);
    throw error;
  }
}

/**
 * Wrapper function for minting a new application
 * @param nft The NFT data to register
 * @returns The registered NFT with its assigned token ID
 */
export async function registerApp(nft: Omit<NFT, "id">): Promise<NFT> {
  return mint(nft);
}

/**
 * Update an application status on the blockchain
 * @param nft The NFT with status to update
 * @returns The updated NFT
 */
export async function updateStatus(nft: NFT): Promise<NFT> {
  try {
    const contract = getAppRegistryContract();
    
    // The contract only supports status updates, not full app updates
    // Since our current implementation doesn't track status,
    // this is a placeholder for when we add status to the NFT type
    const status = 0; // Pending status (default)
    
    console.log(`Updating status for app with DID: ${nft.did} to status: ${status}`);
    
    // Use contract.write directly with casting
    await (contract as any).write.updateStatus([
      nft.did,
      status
    ]);
    
    // Return the updated NFT
    return nft;
  } catch (error) {
    console.error("Error updating app status:", error);
    throw error;
  }
}
