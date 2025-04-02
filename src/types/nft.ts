export interface NFT {
    did: string   // Primary identifier
    name: string
    version: string
    dataUrl: string
    iwpsPortalUri: string
    agentPortalUri: string
    contractAddress?: string
}