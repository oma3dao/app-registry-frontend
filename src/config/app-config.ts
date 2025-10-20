/**
 * Application configuration constants
 */

import { MAX_URL_LENGTH, MAX_DID_LENGTH, MAX_NAME_LENGTH } from '@/lib/validation';
import { env } from './env';

/**
 * Number of latest apps to show on the landing page
 */
export const LANDING_PAGE_NUM_APPS = 20; 

/**
 * Documentation URL for self-hosting app endpoints
 */
export const SELF_HOSTING_DOCS_URL = "https://docs.oma3.org/app-registry/self-hosting"; 

/**
 * Base URL for app registry metadata
 * Dynamically set based on deployment environment
 */
export const APP_REGISTRY_METADATA_BASE_URL = `${env.appBaseUrl}/api/data-url`;

/**
 * OMA3 main documentation URL
 */
export const OMA3_DOCS_URL = "https://docs.oma3.org";

/**
 * OMA3 main website URL
 */
export const OMA3_WEBSITE_URL = "https://oma3.org";

/**
 * Base URL for IWPS Portal
 * Dynamically set based on deployment environment
 */
export const IWPS_PORTAL_BASE_URL = `${env.appBaseUrl}/api/portal-url`;

/**
 * Validation message constants
 */

// URL validation related messages
export const URL_ERROR_MESSAGE = `Please enter a valid URL (max ${MAX_URL_LENGTH} characters)`;
export const URL_PLACEHOLDER = `Valid URL (max ${MAX_URL_LENGTH} characters)`;

// DID validation related messages
export const DID_ERROR_MESSAGE = `Valid DID required (max ${MAX_DID_LENGTH} characters, format: did:method:id)`;
export const DID_PLACEHOLDER = `did:method:id (max ${MAX_DID_LENGTH} chars)`;

// Name validation related messages
export const NAME_ERROR_MESSAGE = `Name must be between 1 and ${MAX_NAME_LENGTH} characters`;
export const NAME_PLACEHOLDER = `Maximum of ${MAX_NAME_LENGTH} characters`;

// Version validation related messages
export const VERSION_ERROR_MESSAGE = `Version must be in format x.y.z or x.y where x, x, and z are numbers`;
export const VERSION_PLACEHOLDER = `Format: x.y.z or x.y (numbers only)`;

// Contract address validation related messages
export const CONTRACT_ERROR_MESSAGE = `Invalid contract address format`;
export const CONTRACT_PLACEHOLDER = `CAIP-2 compliant contract address`;

/**
 * Metadata JSON keys
 */
// Top-level keys
export const METADATA_JSON_NAME_KEY = "name";
// Removed METADATA_JSON_DESCRIPTION_URL_KEY - not in OMATrust spec
export const METADATA_JSON_MARKETING_URL_KEY = "external_url";
export const METADATA_JSON_TOKEN_CONTRACT_KEY = "token";
export const METADATA_JSON_ICON_URL_KEY = "image";
export const METADATA_JSON_SCREENSHOTS_URLS_KEY = "screenshotUrls";
export const METADATA_JSON_PLATFORM_KEY = "platforms";

// Platform keys
export const METADATA_JSON_WEB_KEY = "web";
export const METADATA_JSON_IOS_KEY = "ios";
export const METADATA_JSON_ANDROID_KEY = "android";
export const METADATA_JSON_WINDOWS_KEY = "windows";
export const METADATA_JSON_MACOS_KEY = "macos";
export const METADATA_JSON_META_KEY = "meta";
export const METADATA_JSON_PLAYSTATION_KEY = "playstation";
export const METADATA_JSON_XBOX_KEY = "xbox";
export const METADATA_JSON_NINTENDO_KEY = "nintendo";

// URL and supported keys
export const METADATA_JSON_URL_LAUNCH_KEY = "launchUrl";
export const METADATA_JSON_URL_DOWNLOAD_KEY = "downloadUrl";
export const METADATA_JSON_SUPPORTED_KEY = "supported";

/**
 * Field keys and labels
 * Keep key and label pairs together for better readability
 */

// Registry field keys and labels
export const DID_KEY = "did";
export const DID_LABEL = "Decentralized Identifier";

export const NAME_KEY = "name";
export const NAME_LABEL = "App Name";

export const VERSION_KEY = "version";
export const VERSION_LABEL = "Version";

export const DATA_URL_KEY = "dataUrl";
export const DATA_URL_LABEL = "Data URL";

export const IWPS_PORTAL_URL_KEY = "iwpsPortalUrl";
export const IWPS_PORTAL_URL_LABEL = "IWPS Portal URL";

export const AGENT_API_URL_KEY = "agentApiUrl";
export const AGENT_API_URL_LABEL = "Agent API URL";

export const CONTRACT_ADDRESS_KEY = "contractAddress";
export const CONTRACT_ADDRESS_LABEL = "Contract Address";

export const STATUS_KEY = "status";
export const STATUS_LABEL = "Status";

export const MINTER_KEY = "minter";
export const MINTER_LABEL = "Minter";

// Metadata field keys and labels
// Removed DESCRIPTION_URL constants - not in OMATrust spec

export const MARKETING_URL_KEY = "external_url";
export const MARKETING_URL_LABEL = "Marketing URL";

export const TOKEN_CONTRACT_KEY = "token";
export const TOKEN_CONTRACT_LABEL = "Token Contract";

export const ICON_URL_KEY = "image";
export const ICON_URL_LABEL = "Icon URL";

export const SCREENSHOT_URLS_KEY = "screenshotUrls";
export const SCREENSHOT_URLS_LABEL = "Screenshot URLs";

export const PLATFORMS_KEY = "platforms";
export const PLATFORMS_LABEL = "Platforms";

// Platform keys and labels
export const WEB_KEY = "web";
export const WEB_LABEL = "Web";

export const IOS_KEY = "ios";
export const IOS_LABEL = "iOS";

export const ANDROID_KEY = "android";
export const ANDROID_LABEL = "Android";

export const WINDOWS_KEY = "windows";
export const WINDOWS_LABEL = "Windows";

export const MACOS_KEY = "macos";
export const MACOS_LABEL = "macOS";

export const META_KEY = "meta";
export const META_LABEL = "Meta Quest";

export const PLAYSTATION_KEY = "playstation";
export const PLAYSTATION_LABEL = "Playstation";

export const XBOX_KEY = "xbox";
export const XBOX_LABEL = "Xbox";

export const NINTENDO_KEY = "nintendo";
export const NINTENDO_LABEL = "Nintendo Switch";

// Platform detail keys and labels
export const DOWNLOAD_URL_KEY = "downloadUrl";
export const DOWNLOAD_URL_LABEL = "Download URL";

export const LAUNCH_URL_KEY = "launchUrl";
export const LAUNCH_URL_LABEL = "Launch URL";

export const SUPPORTED_KEY = "supported";
export const SUPPORTED_DEVICES_LABEL = "Supported Devices";

/**
 * IWPS Input Keys
 */
export const IWPS_LOCATION_KEY = "location";
export const IWPS_UPDATED_PORTAL_URL_KEY = "portalUrl";
export const IWPS_SOURCE_ISA_KEY = "sourceIsa";
export const IWPS_SOURCE_BITS_KEY = "sourceBits";
export const IWPS_SOURCE_OS_KEY = "sourceOs";
export const IWPS_SOURCE_OS_VERSION_KEY = "sourceOsVersion";
export const IWPS_SOURCE_CLIENT_TYPE_KEY = "sourceClientType";
export const IWPS_TELEPORT_ID_KEY = "teleportId";
export const IWPS_USER_ID_KEY = "userId";
export const IWPS_TELEPORT_PIN_KEY = "teleportPin";
export const IWPS_SOURCE_ACK_URL_KEY = "sourceAckUrl";
export const IWPS_SOURCE_NACK_URL_KEY = "sourceNackUrl";

/**
 * IWPS Response Keys
 */
export const IWPS_APPROVAL_KEY = "approval";
export const IWPS_DESTINATION_URL_KEY = "destinationUrl";
export const IWPS_DOWNLOAD_URL_KEY = "downloadUrl";
export const IWPS_EXPIRATION_KEY = "expiration";
export const IWPS_ERROR_KEY = "error";

/**
 * IWPS Default Values / Placeholders
 */
export const IWPS_DEFAULT_ACK_URL = "";
export const IWPS_DEFAULT_NACK_URL = "";

