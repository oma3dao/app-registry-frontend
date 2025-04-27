/**
 * Application configuration constants
 */

import { MAX_URL_LENGTH, MAX_DID_LENGTH, MAX_NAME_LENGTH } from '@/lib/validation';

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
 */
export const APP_REGISTRY_METADATA_BASE_URL = "https://appregistry.oma3.org/api/data-url";

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
 */
export const IWPS_PORTAL_BASE_URL = "https://appregistry.oma3.org/api/portal-uri";

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
export const VERSION_ERROR_MESSAGE = `Version must be in format X.Y.Z or X.Y where X, Y, and Z are numbers`;
export const VERSION_PLACEHOLDER = `Format: x.y.z or x.y (numbers only)`;

// Contract address validation related messages
export const CONTRACT_ERROR_MESSAGE = `Invalid contract address format`;
export const CONTRACT_PLACEHOLDER = `CAIP-2 compliant contract address`;