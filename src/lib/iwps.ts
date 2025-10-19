import * as AppConfig from '@/config/app-config';
import type { NFT } from "@/schema/data-model";

// Define the structure for Group 1 parameters
// Using IWPS constants for potential keys, but values are detected
interface DeviceParameters {
  [AppConfig.IWPS_SOURCE_OS_KEY]?: string | null;
  [AppConfig.IWPS_SOURCE_ISA_KEY]?: string | null;
  [AppConfig.IWPS_SOURCE_BITS_KEY]?: string | null;
  [AppConfig.IWPS_SOURCE_CLIENT_TYPE_KEY]?: string | null;
  [AppConfig.IWPS_SOURCE_OS_VERSION_KEY]?: string | null;
}

/**
 * Attempts to detect basic device parameters relevant for IWPS Group 1.
 * Note: This is a basic implementation. More robust detection might need
 * userAgent parsing libraries or navigator.userAgentData (with fallbacks).
 * 
 * @returns An object containing detected parameters. Undetected values are null.
 */
export function detectDeviceParameters(): DeviceParameters {
  const params: DeviceParameters = {
    [AppConfig.IWPS_SOURCE_OS_KEY]: null,
    [AppConfig.IWPS_SOURCE_ISA_KEY]: null, // Hard to detect reliably
    [AppConfig.IWPS_SOURCE_BITS_KEY]: null, // Hard to detect reliably
    [AppConfig.IWPS_SOURCE_CLIENT_TYPE_KEY]: 'browser', // Assume browser for now
    [AppConfig.IWPS_SOURCE_OS_VERSION_KEY]: null, // Hard to detect reliably without UA parsing
  };

  try {
    // OS Detection (Basic)
    const platform = navigator.platform?.toLowerCase() || '';
    if (platform.startsWith('mac') || platform.includes('darwin')) {
      params[AppConfig.IWPS_SOURCE_OS_KEY] = 'macos';
    } else if (platform.startsWith('win')) {
      params[AppConfig.IWPS_SOURCE_OS_KEY] = 'windows';
    } else if (platform.includes('linux')) {
      params[AppConfig.IWPS_SOURCE_OS_KEY] = 'linux';
    } else if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      // Crude mobile detection - better to check userAgent for ios/android specifically
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        params[AppConfig.IWPS_SOURCE_OS_KEY] = 'ios';
      } else if (userAgent.includes('android')) {
        params[AppConfig.IWPS_SOURCE_OS_KEY] = 'android';
      }
    }

    // TODO: Implement more robust detection using navigator.userAgentData if available
    // E.g., navigator.userAgentData?.platform, navigator.userAgentData?.architecture
    // Need fallbacks for browsers that don't support it.

  } catch (e) {
    console.error("Error detecting device parameters:", e);
  }

  return params;
}

/**
 * Generates a random 4-digit PIN as a string.
 */
export function generateTeleportPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generates a pseudo-random ID (using timestamp + random number for simplicity).
 * Note: Not a true 128-bit integer or UUID, but serves as a placeholder.
 */
export function generateTeleportId(): string {
  // Using timestamp and random number for simplicity. 
  // For more robust ID, consider crypto.randomUUID() if browser support is sufficient.
  return crypto.randomUUID();
}

/**
 * Builds the complete request body to be sent to the IWPS Query Proxy.
 * Internally calls functions to detect device parameters and generate IWPS Group 2 params.
 * 
 * @param nft The NFT object containing iwpsPortalUrl.
 * @returns An object containing the `requestBody` for the proxy and the `generatedPin`.
 */
export function buildIwpsProxyRequest(nft: NFT): { requestBody: any; generatedPin: string } {
  // --- Step 1: Gather Group 1 parameters (device info) --- 
  const group1Params = detectDeviceParameters();

  // --- Step 2: Gather/Generate Group 2 parameters --- 
  const _teleportId = generateTeleportId();
  const _teleportPin = generateTeleportPin(); // Store for confirmation dialog
  const _userId = ""; // Spec: empty string
  const _sourceAckUrl = AppConfig.IWPS_DEFAULT_ACK_URL; // Use constant
  const _sourceNackUrl = AppConfig.IWPS_DEFAULT_NACK_URL; // Use constant

  // Helper to build iwpsParams, conditionally adding Group 1 params
  const buildIwpsParams = () => {
    const params: any = {
      // Group 2 - always included
      [AppConfig.IWPS_TELEPORT_ID_KEY]: _teleportId,
      [AppConfig.IWPS_TELEPORT_PIN_KEY]: _teleportPin,
      [AppConfig.IWPS_USER_ID_KEY]: _userId,
      [AppConfig.IWPS_SOURCE_ACK_URL_KEY]: _sourceAckUrl,
      [AppConfig.IWPS_SOURCE_NACK_URL_KEY]: _sourceNackUrl,
      [AppConfig.IWPS_LOCATION_KEY]: "", // Per spec, default to empty string
    };

    // Group 1 - conditionally included
    if (group1Params[AppConfig.IWPS_SOURCE_OS_KEY]) {
      params[AppConfig.IWPS_SOURCE_OS_KEY] = group1Params[AppConfig.IWPS_SOURCE_OS_KEY];
    }
    if (group1Params[AppConfig.IWPS_SOURCE_ISA_KEY]) {
      params[AppConfig.IWPS_SOURCE_ISA_KEY] = group1Params[AppConfig.IWPS_SOURCE_ISA_KEY];
    }
    if (group1Params[AppConfig.IWPS_SOURCE_BITS_KEY]) {
      params[AppConfig.IWPS_SOURCE_BITS_KEY] = group1Params[AppConfig.IWPS_SOURCE_BITS_KEY];
    }
    if (group1Params[AppConfig.IWPS_SOURCE_CLIENT_TYPE_KEY]) {
      params[AppConfig.IWPS_SOURCE_CLIENT_TYPE_KEY] = group1Params[AppConfig.IWPS_SOURCE_CLIENT_TYPE_KEY];
    }
    if (group1Params[AppConfig.IWPS_SOURCE_OS_VERSION_KEY]) {
      params[AppConfig.IWPS_SOURCE_OS_VERSION_KEY] = group1Params[AppConfig.IWPS_SOURCE_OS_VERSION_KEY];
    }
    return params;
  };

  // Construct the body to send TO THE PROXY
  const requestBody: any = {
    targetIwpsPortalUrl: nft.iwpsPortalUrl, // Pass the target URL to the proxy
    iwpsParams: buildIwpsParams(),
  };

  return { requestBody, generatedPin: _teleportPin };
} 