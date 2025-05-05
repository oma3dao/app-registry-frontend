"use client"

import React, { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NFT } from "@/types/nft"
import type { MetadataContractData } from '@/types/metadata-contract'
import type { WizardFormData } from '@/types/form'
import {
  validateUrl,
  validateVersion,
  validateDid, 
  validateName, 
  validateCaipAddress
} from "@/lib/validation"
import { isMobile, normalizeMetadata } from "@/lib/utils"
import { TransactionAlert } from "@/components/ui/transaction-alert"
import { ExternalLinkIcon, EditIcon, AlertCircleIcon, ArrowLeftIcon, ArrowRightIcon, InfoIcon } from "lucide-react"
import { ImagePreview } from "@/components/image-preview"
import { UrlValidator } from "@/components/url-validator"
import type { Platforms, PlatformDetails } from "@/types/metadata-contract"
import { log } from "@/lib/log"
import { 
  URL_ERROR_MESSAGE, 
  URL_PLACEHOLDER, 
  NAME_ERROR_MESSAGE, 
  NAME_PLACEHOLDER,
  DID_ERROR_MESSAGE, 
  DID_PLACEHOLDER,
  VERSION_ERROR_MESSAGE, 
  VERSION_PLACEHOLDER,
  CONTRACT_ERROR_MESSAGE, 
  CONTRACT_PLACEHOLDER,
  APP_REGISTRY_METADATA_BASE_URL,
  IWPS_PORTAL_BASE_URL,
  SELF_HOSTING_DOCS_URL
} from '@/config/app-config'

// Define type for wizard steps
export type WizardStep = 1 | 2 | 3 | 4 | 5;

// Define a type for the keys of STEP_FIELDS
const STEP_FIELDS: Record<WizardStep, FieldDescriptor[]> = {
  1: [
    { name: 'name', isRequired: true },
    { name: 'version', isRequired: true },
    { name: 'did', isRequired: true },
    { name: 'dataUrl', isRequired: true },
    { name: 'iwpsPortalUri', isRequired: true },
    { name: 'agentApiUri', isRequired: false },
    { name: 'contractAddress', isRequired: false }
  ],
  2: [
    { name: 'metadata.descriptionUrl', isRequired: true },
    { name: 'metadata.external_url', isRequired: true },
    { name: 'metadata.token', isRequired: false }
  ],
  3: [
    { name: 'metadata.image', isRequired: true },
    { name: 'metadata.screenshotUrls', isRequired: true }
  ],
  4: [
    { name: 'metadata.platforms', isRequired: true }
  ],
  5: [] // No specific fields required for step 5
};

// Step titles for the wizard
const stepTitles = {
  1: "App Identity & URLs",
  2: "App Description",
  3: "App Images",
  4: "Platform Availability",
  5: "Review & Submit"
};

interface NFTMintModalProps {
  isOpen: boolean
  handleCloseMintModal: () => void
  onSave: (nft: NFT, currentStep: number) => Promise<void>
  nft: NFT | null
  initialMetadata?: Record<string, any> | null
  currentStep: WizardStep
  onStepChange: (step: WizardStep) => void
}

// Helper function to convert from NFT to WizardFormData
const nftToWizardForm = (nft: NFT): WizardFormData => {
  // TODO: This needs updating once the source NFT type uses the nested structure.
  // For now, it assumes the input NFT *might* still have the old flat structure
  // and attempts to map it to the new nested WizardFormData structure.

  // Default to empty platforms if metadata or platforms are missing
  const sourcePlatforms = nft.metadata?.platforms || {};

  // Explicitly map known platform keys if they exist in the source
  const platformAvailability: Platforms = {
    web: sourcePlatforms.web,
    ios: sourcePlatforms.ios,
    android: sourcePlatforms.android,
    windows: sourcePlatforms.windows,
    macos: sourcePlatforms.macos,
    meta: sourcePlatforms.meta,
    playstation: sourcePlatforms.playstation,
    xbox: sourcePlatforms.xbox,
    nintendo: sourcePlatforms.nintendo,
  };

  // Clean up any keys that ended up undefined (if source didn't have them)
  Object.keys(platformAvailability).forEach(key => {
      const platformKey = key as keyof Platforms;
      if (platformAvailability[platformKey] === undefined) {
        delete platformAvailability[platformKey];
      }
  });

  // Normalize the metadata using our helper function, but preserve the platforms we just processed
  const normalizedMetadata = normalizeMetadata(nft.metadata);
  
  return {
    // Registry fields
    did: nft.did,
    name: nft.name,
    version: nft.version,
    dataUrl: nft.dataUrl,
    iwpsPortalUri: nft.iwpsPortalUri,
    agentApiUri: nft.agentApiUri,
    contractAddress: nft.contractAddress || "",
    status: nft.status || 0,
    minter: nft.minter || "",
    
    // Use normalized metadata but override platforms with our processed version
    metadata: {
      ...normalizedMetadata,
      platforms: platformAvailability
    } as MetadataContractData
  };
};

// Helper function to convert from WizardFormData to NFT
const wizardFormToNft = (formData: WizardFormData): NFT => {
  // Extract registry fields
  const { metadata, ...registryFields } = formData;
  
  // Return as NFT, passing the metadata object (including nested platforms) as is.
  // The consumer (e.g., buildMetadataJSON) will handle the structure.
  return {
    ...registryFields,
    metadata: metadata ? { ...metadata } : undefined
  } as NFT;
};

// Define a type for field descriptors
interface FieldDescriptor {
  name: string;
  isRequired: boolean;
}

// Utility function to validate fields
const validateFields = (fields: FieldDescriptor[], formData: WizardFormData) => {
  const errors: Record<string, string> = {};
  fields.forEach(({ name, isRequired }) => {
    // Handle nested fields (metadata.field)
    const value = name.includes('.') ? formData.metadata?.[name.split('.')[1] as keyof typeof formData.metadata] : formData[name as keyof WizardFormData];
    
    // Special handling for platforms
    if (name === 'metadata.platforms') {
      const platforms = value as Platforms;
      log("[validateFields] Checking platforms:", platforms);

      const hasAtLeastOnePlatform = platforms && Object.keys(platforms).length > 0 && 
        Object.values(platforms).some(details => 
          (details?.downloadUrl && details.downloadUrl.trim() !== '') || 
          (details?.launchUrl && details.launchUrl.trim() !== '')
        );

      if (!hasAtLeastOnePlatform) {
        errors['metadata.platforms'] = "At least one platform URL (Download or Launch) must be provided.";
      }

      // Validate individual platform URLs (only if http/https)
      else if (platforms) {
        Object.entries(platforms).forEach(([platformKey, details]) => {
          const pKey = platformKey as keyof Platforms; // Type assertion
          if (details?.downloadUrl && details.downloadUrl.startsWith('http') && !validateUrl(details.downloadUrl)) {
            errors[`metadata.platforms.${pKey}.downloadUrl`] = URL_ERROR_MESSAGE;
          }
          if (details?.launchUrl && details.launchUrl.startsWith('http') && !validateUrl(details.launchUrl)) {
            errors[`metadata.platforms.${pKey}.launchUrl`] = URL_ERROR_MESSAGE;
          }
        });
      }
      
      log("[validateFields] Platform validation result:", hasAtLeastOnePlatform);
      log("[validateFields] Platform errors:", errors);
      
    } else if (isRequired && !value) {
      errors[name] = `${name} is required.`;
    } else if (value) {
      let error = '';
      switch (name) {
        case 'version':
          if (!validateVersion(value as string)) error = VERSION_ERROR_MESSAGE;
          break;
        case 'dataUrl':
        case 'iwpsPortalUri':
        case 'agentApiUri':
        case 'metadata.descriptionUrl':
        case 'metadata.external_url':
        case 'metadata.image':
          if (!validateUrl(value as string)) error = URL_ERROR_MESSAGE;
          break;
        case 'did':
          if (!validateDid(value as string)) error = DID_ERROR_MESSAGE;
          break;
        case 'name':
          if (!validateName(value as string)) error = NAME_ERROR_MESSAGE;
          break;
        case 'contractAddress':
        case 'metadata.token':
          if (!validateCaipAddress(value as string)) error = CONTRACT_ERROR_MESSAGE;
          break;
      }
      if (error) {
        errors[name] = error;
      }
    }
  });

  log("[validateFields] Validation errors:", errors);
  return errors;
};

// Function to validate registration fields
const validateRegistration = (formData: WizardFormData) => {
  return validateFields(STEP_FIELDS[1], formData);
};

// Function to validate metadata fields
const validateMetadata = (formData: WizardFormData) => {
  const metadataErrors: Record<string, string> = {};
  for (let step = 2; step <= 4; step++) {
    const stepErrors = validateFields(STEP_FIELDS[step as WizardStep], formData);
    Object.assign(metadataErrors, stepErrors);
  }
  return metadataErrors;
};

export default function NFTMintModal({ 
  isOpen, 
  handleCloseMintModal, 
  onSave, 
  nft, 
  initialMetadata,
  currentStep,
  onStepChange
}: NFTMintModalProps) {
  const [formData, setFormData] = useState<WizardFormData>({
    // Registry fields (direct properties)
    did: "",
    name: "",
    version: "",
    dataUrl: "",
    iwpsPortalUri: "",
    agentApiUri: "",
    contractAddress: "",
    status: 0, // Default to Active
    minter: "", // Initial placeholder
    
    // Metadata fields (nested under metadata)
    metadata: {
      descriptionUrl: "",
      external_url: "",
      token: "",
      image: "",
      screenshotUrls: ["", "", "", "", ""],
      // Initialize with empty platforms object
      platforms: {}
    }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showTxAlert, setShowTxAlert] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [isCustomizingUrls, setIsCustomizingUrls] = useState(false)
  
  // Function to generate default URLs based on DID and version
  const generateDefaultUrls = (did: string, version: string) => {
    console.log(`Generating URLs for DID: '${did}' and version: '${version}'`);
    // Only generate URLs if both DID and version are present
    const hasBothValues = did && version;
    
    // Generate data URL
    const dataUrl = hasBothValues 
      ? `${APP_REGISTRY_METADATA_BASE_URL}/${did}/v/${version}` 
      : "";
    
    // Generate IWPS Portal URI with the same pattern
    const iwpsPortalUri = hasBothValues
      ? `${IWPS_PORTAL_BASE_URL}/${did}/v/${version}`
      : "";
    
    console.log(`Generated dataUrl: '${dataUrl}'`);
    console.log(`Generated iwpsPortalUri: '${iwpsPortalUri}'`);
    
    return {
      dataUrl,
      iwpsPortalUri,
      agentApiUri: ""
    };
  }

  // Initialize form data when modal opens
  useEffect(() => {
    if (nft) {
      // Existing NFT - use its values
      const baseFormData = nftToWizardForm(nft);
      
      // If initialMetadata is provided, merge it carefully
      if (initialMetadata) {
        log("Setting form data with initialMetadata:", initialMetadata);
        const normalizedInitialMetadata = normalizeMetadata(initialMetadata);

        // Merge metadata, prioritizing initialMetadata only if its screenshotUrls are valid and non-empty
        // Also ensure all required string fields have default values
        const mergedMetadata: MetadataContractData = {
          descriptionUrl: normalizedInitialMetadata.descriptionUrl || baseFormData.metadata?.descriptionUrl || "",
          external_url: normalizedInitialMetadata.external_url || baseFormData.metadata?.external_url || "",
          token: normalizedInitialMetadata.token || baseFormData.metadata?.token || "",
          image: normalizedInitialMetadata.image || baseFormData.metadata?.image || "",
          description: normalizedInitialMetadata.description || baseFormData.metadata?.description || undefined, // Description can be optional (string | undefined)
          platforms: { ...baseFormData.metadata?.platforms, ...normalizedInitialMetadata.platforms }, // Merge platforms, initialMetadata takes priority
          // Explicitly handle screenshotUrls: prioritize valid initialMetadata, then baseFormData, then default
          screenshotUrls: 
            Array.isArray(normalizedInitialMetadata.screenshotUrls) && normalizedInitialMetadata.screenshotUrls.some(url => url && url.trim() !== '')
            ? normalizedInitialMetadata.screenshotUrls 
            : baseFormData.metadata?.screenshotUrls || ["", "", "", "", ""] // Fallback to base or default
        };
        
        setFormData({
          ...baseFormData,
          metadata: mergedMetadata
        });
      } else {
        setFormData(baseFormData);
      }
      
      // Clear errors when opening with existing NFT
      setErrors({});
    } else {
      // For new NFT, set default values
      // Normalize the metadata to ensure it has all required fields
      const normalizedMetadata = normalizeMetadata(initialMetadata);
      
      const emptyNft: WizardFormData = {
        did: "",
        name: "",
        version: "",
        dataUrl: "",
        iwpsPortalUri: "",
        agentApiUri: "",
        contractAddress: "",
        status: 0, // Default to Active
        minter: "",
        metadata: {
          descriptionUrl: "",
          external_url: "",
          token: "",
          image: "",
          screenshotUrls: ["", "", "", "", ""],
          platforms: {},
          ...normalizedMetadata
        } as MetadataContractData
      };
      
      setFormData(emptyNft);
      // Clear errors when opening empty form
      setErrors({});
    }
    // Reset state when modal opens
    setIsSaving(false);
    setShowTxAlert(false);
    setTxError(null);
    setIsCustomizingUrls(false);
  }, [nft, isOpen, initialMetadata]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Check if the field belongs to platform availability
    const platformMatch = name.match(/^(web|ios|android|windows|macos|meta|playstation|xbox|nintendo)_(downloadUrl|launchUrl|supported)$/);

    if (platformMatch) {
      // Ensure platformKey is one of the known keys for type safety
      const platformKey = platformMatch[1] as keyof Platforms;
      const fieldKey = platformMatch[2] as keyof PlatformDetails;

      // Validate if platformKey and fieldKey are valid before proceeding
      if (!platformKey || !fieldKey) {
          console.error("Invalid platform or field key extracted:", name);
          return; // Exit if keys are invalid
      }

      setFormData(prev => {
        const updatedPlatforms: Platforms = { ...(prev.metadata?.platforms || {}) };
        // Ensure the specific platform details object exists
        const updatedPlatformDetails: PlatformDetails = { ...(updatedPlatforms[platformKey] || {}) };

        if (fieldKey === 'supported') {
          // Handle comma-separated string for supported devices/architectures
          updatedPlatformDetails[fieldKey] = value.split(',').map(item => item.trim()).filter(Boolean);
        } else {
          updatedPlatformDetails[fieldKey] = value;
        }

        // Only include platform details if they have any actual values
        if (Object.values(updatedPlatformDetails).some(v => v && (Array.isArray(v) ? v.length > 0 : true))) {
          updatedPlatforms[platformKey] = updatedPlatformDetails;
        } else {
          // Remove the platform key if all its details are empty
          delete updatedPlatforms[platformKey];
        }

        return {
          ...prev,
          metadata: {
            ...(prev.metadata!),
            platforms: updatedPlatforms,
          },
        };
      });

      // Validation for platform URLs (only if http/https)
      if ((fieldKey === 'downloadUrl' || fieldKey === 'launchUrl') && value && value.startsWith('http') && !validateUrl(value)) {
         setErrors(prev => ({ 
           ...prev, 
           [`metadata.platforms.${String(platformKey)}.${String(fieldKey)}`]: URL_ERROR_MESSAGE 
         }));
       } else {
         setErrors(prev => {
           const newErrors = { ...prev };
           // Use template literal safely with validated keys
           const errorKey = `metadata.platforms.${String(platformKey)}.${String(fieldKey)}`;
           delete newErrors[errorKey];
           // Also clear the general platform error if user enters a value
           if (value.trim() !== '') {
              delete newErrors['metadata.platforms'];
           }
           return newErrors;
         });
       }

    } else if (name.startsWith('metadata.')) {
       // Handle other nested metadata fields (descriptionUrl, external_url, image, etc.)
       const metadataField = name.split('.')[1];
       setFormData(prev => ({
         ...prev,
         metadata: {
           ...prev.metadata!,
           [metadataField]: value,
         },
       }));
       // Add specific validation for these fields if needed (like in validateStep)
       // Simplified validation on change for example:
       if ((metadataField === 'descriptionUrl' || metadataField === 'external_url' || metadataField === 'image') && value && !validateUrl(value)) {
          setErrors(prev => ({ ...prev, [name]: URL_ERROR_MESSAGE }));
       } else if (metadataField === 'token' && value && !validateCaipAddress(value)) {
          setErrors(prev => ({ ...prev, [name]: CONTRACT_ERROR_MESSAGE }));
       } else {
          setErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
       }
    } else if ((name === 'did' || name === 'version') && !isCustomizingUrls) {
       // Handle DID/Version change affecting default URLs
      const updatedFormData = { ...formData, [name]: value };
      const hasBothValues = 
        (name === 'did' ? value : formData.did) && 
        (name === 'version' ? value : formData.version);
      
      console.log('handleChange - checking for URL update:', {
        field: name,
        value,
        hasBothValues,
        did: name === 'did' ? value : formData.did,
        version: name === 'version' ? value : formData.version
      });
      
      // Generate default URLs based on the updated values
      const defaults = generateDefaultUrls(
        name === 'did' ? value : formData.did,
        name === 'version' ? value : formData.version
      );
      
      // Update form data with field value and auto-generated URLs
      setFormData(prev => {
        const updated = { ...prev, [name]: value }; // Ensure changed field value is preserved
        
        // Only set the dataUrl if both DID and version are available
        if (hasBothValues) {
          updated.dataUrl = defaults.dataUrl;
        }
        
        // Always update the other URLs
        updated.iwpsPortalUri = defaults.iwpsPortalUri;
        updated.agentApiUri = defaults.agentApiUri;
        
        return updated;
      });
    } else {
      // For non-URL related fields, simply update the form data
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Field-specific validations
    switch (name) {
      case "version":
        if (value && !validateVersion(value)) {
          setErrors(prev => ({ 
            ...prev, 
            version: VERSION_ERROR_MESSAGE
          }))
        } else {
          setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.version
            return newErrors
          })
        }
        break
        
      case "dataUrl":
      case "iwpsPortalUri":
      case "agentApiUri":
        if (value && !validateUrl(value)) {
          setErrors(prev => ({ 
            ...prev, 
            [name]: URL_ERROR_MESSAGE
          }))
        } else {
          setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[name]
            return newErrors
          })
        }
        break
        
      case "did":
        if (value && !validateDid(value)) {
          setErrors(prev => ({ 
            ...prev, 
            did: DID_ERROR_MESSAGE
          }))
        } else {
          setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.did
            return newErrors
          })
        }
        break
        
      case "name":
        if (value && !validateName(value)) {
          setErrors(prev => ({ 
            ...prev, 
            name: NAME_ERROR_MESSAGE
          }))
        } else {
          setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.name
            return newErrors
          })
        }
        break
        
      case "contractAddress":
        if (value && !validateCaipAddress(value)) {
          setErrors(prev => ({ 
            ...prev, 
            contractAddress: CONTRACT_ERROR_MESSAGE
          }))
        } else {
          setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.contractAddress
            return newErrors
          })
        }
        break
    }
  }

  const toggleUrlCustomization = () => {
    if (!isCustomizingUrls) {
      // Enable customization mode and clear URL fields
      setFormData(prev => ({
        ...prev,
        dataUrl: "",
        iwpsPortalUri: "",
      }));
      setIsCustomizingUrls(true);
    } else {
      // Revert to default URLs
      const defaults = generateDefaultUrls(formData.did, formData.version);
      setFormData(prev => ({
        ...prev,
        dataUrl: defaults.dataUrl,
        iwpsPortalUri: defaults.iwpsPortalUri,
        agentApiUri: defaults.agentApiUri
      }));
      setIsCustomizingUrls(false);
    }
  };

  // Handle next button click - validate current step before proceeding
  const handleNextStep = async () => {
    log(`[handleNextStep] Called for step ${currentStep}`);

    // Validate fields for the current step
    const stepErrors = validateFields(STEP_FIELDS[currentStep], formData);
    log(`[handleNextStep] Validation errors for step ${currentStep}:`, stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      log(`[handleNextStep] validateFields returned errors for step ${currentStep}, not advancing.`);
      setErrors(stepErrors);
      return;
    }

    // Move to the next step
    log(`[handleNextStep] No validation errors for step ${currentStep}, advancing to next step.`);
    const nextStep = currentStep + 1;
    log(`[handleNextStep] Advancing to step ${nextStep}`);
    onStepChange(nextStep > 5 ? 5 : nextStep as WizardStep);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log(`[handleSubmit] formData:`, JSON.stringify(formData, null, 2));
    console.log(`[handleSubmit] Current step:`, currentStep);
    e.preventDefault();
    
    // Validate fields for the current step
    if (currentStep === 1) {
      // Validate step 1 fields using validateRegistration
      const registrationErrors = validateRegistration(formData);
      if (Object.keys(registrationErrors).length > 0) {
        log(`[handleSubmit] validateRegistration returned errors, not submitting.`);
        setErrors(registrationErrors);
        return;
      }
    } else if (currentStep === 5) {
      // Validate steps 2, 3, and 4 fields using validateMetadata
      const metadataErrors = validateMetadata(formData);
      if (Object.keys(metadataErrors).length > 0) {
        setErrors(metadataErrors);
        return;
      }
    } else {
      log('handleSubmit called with currentStep != 1 or 5, not submitting and calling handleNextStep instead.');
      handleNextStep();
      return;
    }
    
    // Prepare the NFT data for registration
    const nftToSubmit = wizardFormToNft(formData);
    (nftToSubmit as any).isCustomUrls = isCustomizingUrls;
    
    setIsSaving(true);
    setShowTxAlert(true);
    setTxError(null);
    
    try {
      // Perform the registration logic
      await onSave(nftToSubmit, currentStep);
      setShowTxAlert(false); // Explicitly clear alert state on success
      
      // Determine the next action based on the current step
      if (currentStep === 1 && !isCustomizingUrls) {
        // Move to step 2 if using default URLs
        onStepChange(2);
      } else {
        // Close the modal if registration is complete
        handleCloseMintModal();
      }
    } catch (error) {
      console.error("Error sending transaction:", error);
      setShowTxAlert(false);
      
      // Display the error to the user
      let errorMessage = "Transaction failed";
      
      // Extract error message if available
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      setTxError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  // Handle previous step navigation
  const handlePrevStep = () => {
    const prevStep = currentStep - 1;
    onStepChange(prevStep < 1 ? 1 : prevStep as WizardStep);
  };

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="name">App Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={NAME_PLACEHOLDER}
                required
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                name="version"
                value={formData.version}
                onChange={handleChange}
                placeholder={VERSION_PLACEHOLDER}
                required
                className={errors.version ? "border-red-500" : ""}
              />
              {errors.version && (
                <p className="text-red-500 text-sm mt-1">{errors.version}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label 
                htmlFor="did" 
                title="To use a web address as a DID, use the format did:web:appname.mydomain.tld"
                className="cursor-help"
              >
                DID
              </Label>
              <Input
                id="did"
                name="did"
                value={formData.did}
                onChange={handleChange}
                placeholder={DID_PLACEHOLDER}
                required
                className={errors.did ? "border-red-500" : ""}
                title="To use a web address as a DID, use the format did:web:subdomain.example.com"
              />
              {errors.did && (
                <p className="text-red-500 text-sm mt-1">{errors.did}</p>
              )}
            </div>

            <div className="border p-4 rounded-md mt-2 mb-2 bg-slate-50 dark:bg-slate-900">
              {isCustomizingUrls && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                  <div className="flex gap-2 items-start text-amber-700 dark:text-amber-400">
                    <AlertCircleIcon size={18} className="mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Self-hosting URLs</p>
                      <p>You are electing to self-host these URLs. Follow the documentation at{" "}
                        <a 
                          href={SELF_HOSTING_DOCS_URL} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
                        >
                          {SELF_HOSTING_DOCS_URL.replace("https://", "")}
                          <ExternalLinkIcon size={14} className="ml-1" />
                        </a>{" "}
                        for self-hosting.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="dataUrl">Data URL</Label>
                  <Textarea
                    id="dataUrl"
                    name="dataUrl"
                    value={formData.dataUrl}
                    onChange={handleChange}
                    placeholder={URL_PLACEHOLDER}
                    required
                    className={`min-h-[80px] ${errors.dataUrl ? "border-red-500" : ""}`}
                    disabled={!isCustomizingUrls}
                  />
                  {errors.dataUrl && (
                    <p className="text-red-500 text-sm mt-1">{errors.dataUrl}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="iwpsPortalUri">IWPS Portal URI</Label>
                  <Textarea
                    id="iwpsPortalUri"
                    name="iwpsPortalUri"
                    value={formData.iwpsPortalUri}
                    onChange={handleChange}
                    placeholder={URL_PLACEHOLDER}
                    required
                    className={`min-h-[80px] ${errors.iwpsPortalUri ? "border-red-500" : ""}`}
                    disabled={!isCustomizingUrls}
                  />
                  {errors.iwpsPortalUri && (
                    <p className="text-red-500 text-sm mt-1">{errors.iwpsPortalUri}</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-center mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleUrlCustomization}
                  className="flex items-center gap-1"
                >
                  {isCustomizingUrls ? "Use Defaults" : "Customize"}
                  {!isCustomizingUrls && <EditIcon size={14} />}
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="agentApiUri">Agent API URI (Optional)</Label>
              </div>
              <Textarea
                id="agentApiUri"
                name="agentApiUri"
                value={formData.agentApiUri}
                onChange={handleChange}
                placeholder={URL_PLACEHOLDER}
                className={`min-h-[80px] ${errors.agentApiUri ? "border-red-500" : ""}`}
              />
              {errors.agentApiUri && (
                <p className="text-red-500 text-sm mt-1">{errors.agentApiUri}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contractAddress">Contract Address (Optional)</Label>
              <Input
                id="contractAddress"
                name="contractAddress"
                value={formData.contractAddress}
                onChange={handleChange}
                placeholder={CONTRACT_PLACEHOLDER}
                className={errors.contractAddress ? "border-red-500" : ""}
              />
              {errors.contractAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.contractAddress}</p>
              )}
            </div>
          </>
        );
        
      case 2:
        return (
          <div className="grid gap-4">
            {/* Description URL */}
            <div className="grid gap-2">
              <Label htmlFor="descriptionUrl">Description URL</Label>
              <Textarea
                id="descriptionUrl"
                name="metadata.descriptionUrl"
                value={formData.metadata?.descriptionUrl || ""}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata!,
                      descriptionUrl: e.target.value
                    }
                  }));
                }}
                onBlur={() => {
                  // Validation happens on blur
                  if (formData.metadata?.descriptionUrl && !validateUrl(formData.metadata.descriptionUrl)) {
                    setErrors(prev => ({ 
                      ...prev, 
                      'metadata.descriptionUrl': URL_ERROR_MESSAGE
                    }));
                  } else if (formData.metadata?.descriptionUrl) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors['metadata.descriptionUrl'];
                      return newErrors;
                    });
                  }
                }}
                placeholder={URL_PLACEHOLDER}
                required
                className={`min-h-[80px] ${errors['metadata.descriptionUrl'] ? "border-red-500" : ""}`}
              />
              {errors['metadata.descriptionUrl'] && (
                <p className="text-red-500 text-sm mt-1">{errors['metadata.descriptionUrl']}</p>
              )}
              <p className="text-xs text-slate-500">
                Link to a document describing your app, including its purpose and features.
              </p>
              
              {/* URL Validator for Description */}
              {validateUrl(formData.metadata?.descriptionUrl || '') && (
                <UrlValidator 
                  url={formData.metadata?.descriptionUrl || ''} 
                />
              )}
            </div>

            {/* Marketing URL */}
            <div className="grid gap-2">
              <Label htmlFor="external_url">Marketing URL</Label>
              <Textarea
                id="external_url"
                name="metadata.external_url"
                value={formData.metadata?.external_url || ""}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata!,
                      external_url: e.target.value
                    }
                  }));
                }}
                onBlur={() => {
                  // Validation happens on blur
                  if (formData.metadata?.external_url && !validateUrl(formData.metadata.external_url)) {
                    setErrors(prev => ({ 
                      ...prev, 
                      'metadata.external_url': URL_ERROR_MESSAGE
                    }));
                  } else if (formData.metadata?.external_url) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors['metadata.external_url'];
                      return newErrors;
                    });
                  }
                }}
                placeholder={URL_PLACEHOLDER}
                required
                className={`min-h-[80px] ${errors['metadata.external_url'] ? "border-red-500" : ""}`}
              />
              {errors['metadata.external_url'] && (
                <p className="text-red-500 text-sm mt-1">{errors['metadata.external_url']}</p>
              )}
              <p className="text-xs text-slate-500">
                Link to your app website, landing page, or marketing materials.
              </p>
              
              {/* URL Validator for Marketing */}
              {validateUrl(formData.metadata?.external_url || '') && (
                <UrlValidator 
                  url={formData.metadata?.external_url || ''} 
                />
              )}
            </div>

            {/* Token Contract Address */}
            <div className="grid gap-2">
              <Label htmlFor="token">Token Contract Address (Optional)</Label>
              <Input
                id="token"
                name="metadata.token"
                value={formData.metadata?.token || ""}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata!,
                      token: e.target.value
                    }
                  }));
                }}
                placeholder={CONTRACT_PLACEHOLDER}
                className={errors['metadata.token'] ? "border-red-500" : ""}
              />
              {errors['metadata.token'] && (
                <p className="text-red-500 text-sm mt-1">{errors['metadata.token']}</p>
              )}
              <p className="text-xs text-slate-500">
                If your app uses a token, enter its contract address here.
              </p>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="grid gap-4 py-4">
            {/* Icon URL */}
            <div className="grid gap-2 mb-4">
              <Label htmlFor="image">Icon URL</Label>
              <Textarea
                id="image"
                name="metadata.image"
                value={formData.metadata?.image || ""}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata!,
                      image: e.target.value
                    }
                  }));
                }}
                onBlur={() => {
                  // Validation happens on blur
                  if (formData.metadata?.image && !validateUrl(formData.metadata.image)) {
                    setErrors(prev => ({ 
                      ...prev, 
                      'metadata.image': URL_ERROR_MESSAGE
                    }));
                  } else if (formData.metadata?.image) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors['metadata.image'];
                      return newErrors;
                    });
                  }
                }}
                placeholder={URL_PLACEHOLDER}
                required
                className={`min-h-[80px] ${errors['metadata.image'] ? "border-red-500" : ""}`}
              />
              {errors['metadata.image'] && (
                <p className="text-red-500 text-sm mt-1">{errors['metadata.image']}</p>
              )}
              <p className="text-xs text-slate-500">
                Link to your app icon image. Square format (1024x1024) is recommended.
              </p>
              
              {/* Icon URL Validator and Preview */}
              {validateUrl(formData.metadata?.image || '') && (
                <>
                  <UrlValidator 
                    url={formData.metadata?.image || ''} 
                  />
                  <ImagePreview 
                    url={formData.metadata?.image || ''} 
                    alt="App icon preview"
                  />
                </>
              )}
            </div>

            {/* Screenshot URLs */}
            <div className="space-y-4">
              <p className="text-sm font-medium">Screenshot URLs</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                First screenshot is required; others are optional. Maximum resolution is 2048 x 2048.
              </p>

              {(formData.metadata?.screenshotUrls || []).map((url, index) => (
                <div key={index} className="grid gap-2">
                  <Label htmlFor={`screenshot${index}`}>
                    Screenshot {index + 1} {index === 0 ? "(Required)" : "(Optional)"}
                  </Label>
                  <Textarea
                    id={`screenshot${index}`}
                    name={`metadata.screenshotUrls[${index}]`}
                    value={url}
                    onChange={(e) => {
                      setFormData(prev => {
                        const newScreenshots = [...(prev.metadata?.screenshotUrls || [])];
                        newScreenshots[index] = e.target.value;
                        return {
                          ...prev,
                          metadata: {
                            ...prev.metadata!,
                            screenshotUrls: newScreenshots
                          }
                        };
                      });
                    }}
                    onBlur={() => {
                      // Validation happens on blur
                      if (url && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          [`metadata.screenshotUrls.${index}`]: URL_ERROR_MESSAGE
                        }));
                      } else if (url) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors[`metadata.screenshotUrls.${index}`];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder={URL_PLACEHOLDER}
                    required={index === 0}
                    className={`min-h-[80px] ${errors[`metadata.screenshotUrls.${index}`] ? "border-red-500" : ""}`}
                    aria-describedby={`screenshot${index}-help`}
                  />
                  {errors[`metadata.screenshotUrls.${index}`] && (
                    <p className="text-red-500 text-sm mt-1">{errors[`metadata.screenshotUrls.${index}`]}</p>
                  )}
                  {index === 0 && (
                    <p id={`screenshot${index}-help`} className="text-xs text-slate-500">
                      Main screenshot of your app. This will be displayed prominently in app listings.
                    </p>
                  )}
                  
                  {/* Screenshot URL Validator and Preview */}
                  {validateUrl(url) && (
                    <>
                      <UrlValidator url={url} />
                      <ImagePreview 
                        url={url} 
                        alt={`App screenshot ${index + 1}`}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="font-medium mb-2">Platform Availability</p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md mb-4">
              <div className="flex gap-2 items-start text-amber-700 dark:text-amber-400">
                <InfoIcon size={18} className="mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Important!</p>
                  <p>You must configure at least one platform URL to register your app. This is a required field.</p>
                </div>
              </div>
            </div>
            
            {errors['metadata.platforms'] && ( // Use general platform error key
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex gap-2 items-start text-red-700 dark:text-red-400">
                  <AlertCircleIcon size={18} className="mt-0.5 flex-shrink-0" />
                  <p id="platforms-error" className="text-sm font-medium">{errors['metadata.platforms']}</p>
                </div>
              </div>
            )}
            
            {/* Web Platform */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">Web Platform</h3>
              <div className="grid gap-2">
                <Label htmlFor="web_launchUrl">Launch URL</Label>
                <Textarea
                  id="web_launchUrl" // Name matches the flat field for handleChange
                  name="web_launchUrl"
                  value={formData.metadata?.platforms?.web?.launchUrl || ''}
                  onChange={handleChange}
                  placeholder="https://example.com/app"
                  className={`min-h-[70px] ${errors['metadata.platforms.web.launchUrl'] ? "border-red-500" : ""}`}
                  aria-describedby={`web_launchUrl-help ${errors['metadata.platforms.web.launchUrl'] ? 'web_launchUrl-error' : ''} ${errors['metadata.platforms'] ? 'platforms-error' : ''}`}
                />
                {errors['metadata.platforms.web.launchUrl'] && (
                  <p id="web_launchUrl-error" className="text-red-500 text-sm mt-1">{errors['metadata.platforms.web.launchUrl']}</p>
                )}
                <p id="web_launchUrl-help" className="text-xs text-slate-500">
                  URL to launch your web application
                </p>
              </div>
            </div>
            
            {/* iOS Platform */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">iOS Platform</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ios_downloadUrl">Download URL</Label>
                  <Textarea
                    id="ios_downloadUrl"
                    name="ios_downloadUrl"
                    value={formData.metadata?.platforms?.ios?.downloadUrl || ''}
                    onChange={handleChange}
                    placeholder="https://apps.apple.com/app/id123456789"
                    className={`min-h-[70px] ${errors['metadata.platforms.ios.downloadUrl'] ? "border-red-500" : ""}`}
                    aria-describedby={`ios_downloadUrl-help ${errors['metadata.platforms.ios.downloadUrl'] ? 'ios_downloadUrl-error' : ''}`}
                  />
                   {errors['metadata.platforms.ios.downloadUrl'] && (
                    <p id="ios_downloadUrl-error" className="text-red-500 text-sm mt-1">{errors['metadata.platforms.ios.downloadUrl']}</p>
                  )}
                  <p id="ios_downloadUrl-help" className="text-xs text-slate-500">
                    App Store URL to download your iOS app
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="ios_launchUrl">Launch URL (Optional)</Label>
                  <Textarea
                    id="ios_launchUrl"
                    name="ios_launchUrl"
                    value={formData.metadata?.platforms?.ios?.launchUrl || ''}
                    onChange={handleChange}
                    placeholder="https://example.com/app or custom-scheme://"
                    className={`min-h-[70px] ${errors['metadata.platforms.ios.launchUrl'] ? "border-red-500" : ""}`}
                    aria-describedby={`ios_launchUrl-help ${errors['metadata.platforms.ios.launchUrl'] ? 'ios_launchUrl-error' : ''}`}
                  />
                  {errors['metadata.platforms.ios.launchUrl'] && (
                    <p id="ios_launchUrl-error" className="text-red-500 text-sm mt-1">{errors['metadata.platforms.ios.launchUrl']}</p>
                  )}
                  <p id="ios_launchUrl-help" className="text-xs text-slate-500">
                    Deep link or URL to launch your iOS app
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="ios_supported">Supported Devices (Optional)</Label>
                  <Input
                    id="ios_supported"
                    name="ios_supported" 
                    value={(formData.metadata?.platforms?.ios?.supported || []).join(', ')}
                    onChange={handleChange}
                    placeholder="iPhone, iPad, VisionPro"
                    className={errors['metadata.platforms.ios.supported'] ? "border-red-500" : ""}
                    aria-describedby={`ios_supported-help ${errors['metadata.platforms.ios.supported'] ? 'ios_supported-error' : ''}`}
                  />
                  <p id="ios_supported-help" className="text-xs text-slate-500">
                    Comma-separated list of supported iOS devices
                  </p>
                </div>
              </div>
            </div>
            
            {/* Android Platform - Similar updates needed... */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">Android Platform</h3>
              <div className="grid gap-4">
                 <div className="grid gap-2">
                  <Label htmlFor="android_downloadUrl">Download URL</Label>
                  <Textarea
                    id="android_downloadUrl"
                    name="android_downloadUrl"
                    value={formData.metadata?.platforms?.android?.downloadUrl || ''}
                    onChange={handleChange}
                    placeholder="https://play.google.com/store/apps/details?id=com.example.app"
                    className={`min-h-[70px] ${errors['metadata.platforms.android.downloadUrl'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.android.downloadUrl'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.android.downloadUrl']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Google Play Store URL to download your Android app
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="android_launchUrl">Launch URL (Optional)</Label>
                  <Textarea
                    id="android_launchUrl"
                    name="android_launchUrl"
                    value={formData.metadata?.platforms?.android?.launchUrl || ''}
                    onChange={handleChange}
                    placeholder="https://example.com/app or app://launch"
                    className={`min-h-[70px] ${errors['metadata.platforms.android.launchUrl'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.platforms.android.launchUrl'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.android.launchUrl']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Deep link or URL to launch your Android app
                  </p>
                </div>
              </div>
            </div>
            
            {/* Windows Platform - Similar updates needed... */}
             <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">Windows Platform</h3>
              <div className="grid gap-4">
                 <div className="grid gap-2">
                  <Label htmlFor="windows_downloadUrl">Download URL</Label>
                  <Textarea
                    id="windows_downloadUrl"
                    name="windows_downloadUrl"
                    value={formData.metadata?.platforms?.windows?.downloadUrl || ''}
                    onChange={handleChange}
                    placeholder="https://apps.microsoft.com/store/detail/yourapp/XXXXXXXX"
                    className={`min-h-[70px] ${errors['metadata.platforms.windows.downloadUrl'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.windows.downloadUrl'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.windows.downloadUrl']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Microsoft Store or website URL to download your Windows app
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="windows_launchUrl">Launch URL (Optional)</Label>
                  <Textarea
                    id="windows_launchUrl"
                    name="windows_launchUrl"
                    value={formData.metadata?.platforms?.windows?.launchUrl || ''}
                    onChange={handleChange}
                    placeholder="oma3://launch"
                    className={`min-h-[70px] ${errors['metadata.platforms.windows.launchUrl'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.platforms.windows.launchUrl'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.windows.launchUrl']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Protocol handler or URL to launch your Windows app
                  </p>
                </div>
                 <div className="grid gap-2">
                  <Label htmlFor="windows_supported">Supported Architectures (Optional)</Label>
                  <Input
                    id="windows_supported"
                    name="windows_supported"
                    value={(formData.metadata?.platforms?.windows?.supported || []).join(', ')}
                    onChange={handleChange} 
                    placeholder="x64, arm64"
                    className={errors['metadata.platforms.windows.supported'] ? "border-red-500" : ""}
                  />
                 {/* ... help text ... */}
                </div>
              </div>
            </div>
            
            {/* macOS Platform - Similar updates needed... */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">macOS Platform</h3>
              <div className="grid gap-4">
                 <div className="grid gap-2">
                  <Label htmlFor="macos_downloadUrl">Download URL</Label>
                  <Textarea
                    id="macos_downloadUrl"
                    name="macos_downloadUrl"
                    value={formData.metadata?.platforms?.macos?.downloadUrl || ''}
                    onChange={handleChange}
                    placeholder="https://apps.apple.com/app/id123456789?mt=12"
                    className={`min-h-[70px] ${errors['metadata.platforms.macos.downloadUrl'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.macos.downloadUrl'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.macos.downloadUrl']}</p>
                  )}
                  {/* ... help text ... */}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="macos_launchUrl">Launch URL (Optional)</Label>
                  <Textarea
                    id="macos_launchUrl"
                    name="macos_launchUrl"
                    value={formData.metadata?.platforms?.macos?.launchUrl || ''}
                    onChange={handleChange}
                    placeholder="oma3://launch"
                    className={`min-h-[70px] ${errors['metadata.platforms.macos.launchUrl'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.macos.launchUrl'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.macos.launchUrl']}</p>
                  )}
                  {/* ... help text ... */}
                </div>
              </div>
            </div>
            
            {/* Meta Quest Platform - Similar updates needed... */}
             <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">Meta Quest Platform</h3>
              <div className="grid gap-4">
                 <div className="grid gap-2">
                  <Label htmlFor="meta_downloadUrl">Download URL</Label>
                  <Textarea
                    id="meta_downloadUrl"
                    name="meta_downloadUrl"
                    value={formData.metadata?.platforms?.meta?.downloadUrl || ''}
                    onChange={handleChange}
                    placeholder="https://www.meta.com/experiences/1234567890"
                    className={`min-h-[70px] ${errors['metadata.platforms.meta.downloadUrl'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.meta.downloadUrl'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.meta.downloadUrl']}</p>
                  )}
                  {/* ... help text ... */}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="meta_launchUrl">Launch URL (Optional)</Label>
                  <Textarea
                    id="meta_launchUrl"
                    name="meta_launchUrl"
                    value={formData.metadata?.platforms?.meta?.launchUrl || ''}
                    onChange={handleChange}
                    placeholder="oculus://store/1234567890"
                    className={`min-h-[70px] ${errors['metadata.platforms.meta.launchUrl'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.platforms.meta.launchUrl'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.meta.launchUrl']}</p>
                  )}
                  {/* ... help text ... */}
                </div>
              </div>
            </div>
            
            {/* Game Consoles Section - Similar updates needed... */}
             <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              {/* ... PlayStation ... */}
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                 <h4 className="text-sm font-medium mb-2">PlayStation</h4>
                <div className="grid gap-2">
                  <Label htmlFor="playstation_downloadUrl">Download URL</Label>
                  <Textarea
                    id="playstation_downloadUrl"
                    name="playstation_downloadUrl"
                    value={formData.metadata?.platforms?.playstation?.downloadUrl || ''}
                    onChange={handleChange}
                    placeholder="https://store.playstation.com/en-us/product/UP9000-CUSA12345_00-YOURGAME0000000"
                    className={`min-h-[70px] ${errors['metadata.platforms.playstation.downloadUrl'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.platforms.playstation.downloadUrl'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.playstation.downloadUrl']}</p>
                  )}
                </div>
              </div>
              {/* ... Xbox ... */}
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                 <h4 className="text-sm font-medium mb-2">Xbox</h4>
                <div className="grid gap-2">
                  <Label htmlFor="xbox_downloadUrl">Download URL</Label>
                  <Textarea
                    id="xbox_downloadUrl"
                    name="xbox_downloadUrl"
                    value={formData.metadata?.platforms?.xbox?.downloadUrl || ''}
                    onChange={handleChange}
                    placeholder="https://www.microsoft.com/store/apps/9NBLGGH4R315"
                    className={`min-h-[70px] ${errors['metadata.platforms.xbox.downloadUrl'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.xbox.downloadUrl'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.xbox.downloadUrl']}</p>
                  )}
                </div>
              </div>
              {/* ... Nintendo Switch ... */}
              <div>
                 <h4 className="text-sm font-medium mb-2">Nintendo Switch</h4>
                <div className="grid gap-2">
                  <Label htmlFor="nintendo_downloadUrl">Download URL</Label>
                  <Textarea
                    id="nintendo_downloadUrl"
                    name="nintendo_downloadUrl"
                    value={formData.metadata?.platforms?.nintendo?.downloadUrl || ''}
                    onChange={handleChange}
                    placeholder="https://www.nintendo.com/store/products/your-game-name-switch/"
                    className={`min-h-[70px] ${errors['metadata.platforms.nintendo.downloadUrl'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.nintendo.downloadUrl'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.nintendo.downloadUrl']}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 5:
        // Update Step 5 (Review) to read from nested structure
        const platforms = formData.metadata?.platforms || {};
        const hasAnyPlatformData = Object.keys(platforms).length > 0;
        return (
          <div className="p-2 sm:p-4 border rounded-md bg-slate-50 dark:bg-slate-900 text-sm">
            
            {/* App Identity */}
            <div className="mb-4">
              <div className="space-y-2">
                <div><span className="font-medium">App Name:</span> {formData.name}</div>
                <div><span className="font-medium">Version:</span> {formData.version}</div>
                <div><span className="font-medium">DID:</span> {formData.did}</div>
              </div>
            </div>
            
            {/* App Metadata */}
            <div className="mb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-2">App Metadata</h3>
              <div className="space-y-2">
                <div className="break-all"><span className="font-medium">Description URL:</span> {formData.metadata?.descriptionUrl}</div>
                <div className="break-all"><span className="font-medium">External URL:</span> {formData.metadata?.external_url}</div>
                <div className="break-all"><span className="font-medium">Icon URL:</span> {formData.metadata?.image}</div>
                <div className="break-all"><span className="font-medium">Token:</span> {formData.metadata?.token || "None"}</div>
                
                {/* Screenshot URLs */}
                <div className="mt-2">
                  <span className="font-medium">Screenshots:</span>
                  {formData.metadata?.screenshotUrls && formData.metadata.screenshotUrls.filter(Boolean).length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {formData.metadata.screenshotUrls.map((url, index) => (
                        url ? (
                          <div key={index} className="break-all text-xs ml-2">
                            {index + 1}. {url}
                          </div>
                        ) : null
                      ))}
                    </div>
                  ) : (
                    <span className="ml-2 text-gray-500 italic">None</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Platform Availability */}
            <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-2">Platform Availability</h3>
              {hasAnyPlatformData ? (
                <div className="space-y-3">
                  {Object.entries(platforms).map(([key, details]) => (
                    details && (details.downloadUrl || details.launchUrl) ? (
                      <div key={key}>
                        <span className="font-medium capitalize">{key}:</span>
                        <div className="mt-1 space-y-1">
                          {details.downloadUrl && (
                            <div className="break-all text-xs">Download URL: {details.downloadUrl}</div>
                          )}
                          {details.launchUrl && (
                            <div className="break-all text-xs">Launch URL: {details.launchUrl}</div>
                          )}
                          {details.supported && details.supported.length > 0 && (
                            <div className="break-all text-xs">Supported: {details.supported.join(", ")}</div>
                          )}
                        </div>
                      </div>
                    ) : null
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No platform availability information provided</div>
              )}
            </div>
          </div>
        );
        
      default:
        // Unexpected step, log an error
        console.error(`Unexpected currentStep: ${currentStep}. This should not happen.`);
        return;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isOpen ? handleCloseMintModal : undefined}>
      <DialogContent className="w-[95%] max-w-[450px] sm:max-w-[550px] md:max-w-[650px] lg:max-w-[750px] max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {currentStep === 5 ? "Review and Submit App Metadata" : "Register New App"}
            </DialogTitle>
            <DialogDescription>
              Step {currentStep} of 5: {stepTitles[currentStep]}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex justify-between mb-4 mt-2 flex-shrink-0">
            {[1, 2, 3, 4, 5].map((step) => (
              <div 
                key={step} 
                className={`w-1/5 h-1 mx-1 rounded-full ${
                  step === currentStep ? 'bg-blue-500' : 
                  step < currentStep ? 'bg-blue-300' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Alerts - keep outside scrolling area */}
          {showTxAlert && (
            <div className="flex-shrink-0">
              <TransactionAlert
                title="Transaction Pending"
                description="Please approve the transaction in your wallet to continue."
                isMobile={isMobile()}
              />
            </div>
          )}

          {txError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md flex-shrink-0">
              <div className="flex gap-2 items-start text-red-700 dark:text-red-400">
                <AlertCircleIcon size={18} className="mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Transaction Error</p>
                  <p>{txError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Scrollable content area */}
          <div className="overflow-y-auto pr-1 flex-grow min-h-0">
            {renderStepContent()}
          </div>

          {/* Static footer */}
          <DialogFooter className="flex justify-between mt-4 pt-4 border-t flex-shrink-0">
            <div>
              {currentStep > 1 && currentStep !== 2 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePrevStep}
                  className="flex items-center gap-1"
                  disabled={isSaving}
                >
                  <ArrowLeftIcon size={16} />
                  Back
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </DialogClose>
              
              <Button 
                type="submit" 
                className="flex items-center gap-1"
              >
                {isSaving ? "Registering..." : 
                 (currentStep === 1 && isCustomizingUrls) ? "Register" :
                 currentStep < 5 ? (
                   <>
                     Next
                     <ArrowRightIcon size={16} />
                   </>
                 ) : "Register"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 