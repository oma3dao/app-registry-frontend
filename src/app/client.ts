import { createThirdwebClient } from "thirdweb";

// Get client ID with better error handling for build time
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

// During build time, use a placeholder to avoid errors
// At runtime, the actual client ID must be present
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

if (!clientId && !isBuildTime) {
  throw new Error("No client ID provided. Please set NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable.");
}

export const client = createThirdwebClient({
  clientId: clientId || "placeholder-for-build",
});
