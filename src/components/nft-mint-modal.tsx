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
import { 
  validateUrl, 
  validateVersion, 
  validateDid, 
  validateName, 
  validateCaipAddress
} from "@/lib/validation"
import type { WizardFormData } from "@/types/form"
import { TransactionAlert } from "@/components/ui/transaction-alert"
import { isMobile } from "@/lib/utils"
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
import { ExternalLinkIcon, EditIcon, AlertCircleIcon, ArrowLeftIcon, ArrowRightIcon, ChevronDown, InfoIcon } from "lucide-react"
import { ImagePreview } from "@/components/image-preview"
import { UrlValidator } from "@/components/url-validator"
import type { Platforms, PlatformDetails } from "@/types/metadata-contract"
import { log } from "@/lib/log"

// Define type for wizard steps
type WizardStep = 1 | 2 | 3 | 4 | 5;

// Group form fields by step for validation
const STEP_FIELDS = {
  1: ['name', 'version', 'did', 'dataUrl', 'iwpsPortalUri', 'agentApiUri', 'contractAddress'],
  2: ['metadata.descriptionUrl', 'metadata.marketingUrl', 'metadata.tokenContractAddress'],
  3: ['metadata.iconUrl', 'metadata.screenshotUrls'],
  4: ['platform_availability'], // Special key for Step 4 check
  5: ['final'] // Final confirmation step - no validation needed
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
  onSave: (nft: NFT) => Promise<void>
  nft: NFT | null
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
    ps5: sourcePlatforms.ps5,
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
    
    // Metadata fields with defaults & nested platforms
    metadata: {
      descriptionUrl: nft.metadata?.descriptionUrl || "",
      marketingUrl: nft.metadata?.marketingUrl || "",
      tokenContractAddress: nft.metadata?.tokenContractAddress || "",
      iconUrl: nft.metadata?.iconUrl || "",
      screenshotUrls: nft.metadata?.screenshotUrls || ["", "", "", "", ""],
      platforms: platformAvailability // Use the constructed nested object
    }
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

export default function NFTMintModal({ isOpen, handleCloseMintModal, onSave, nft }: NFTMintModalProps) {
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
      marketingUrl: "",
      tokenContractAddress: "",
      iconUrl: "",
      screenshotUrls: ["", "", "", "", ""],
      // Initialize with empty platforms object
      platforms: {}
    }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showTxAlert, setShowTxAlert] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
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
      setFormData(nftToWizardForm(nft));
      // Clear errors when opening with existing NFT
      setErrors({});
    } else {
      // For new NFT, set default values
      const emptyNft = {
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
          marketingUrl: "",
          tokenContractAddress: "",
          iconUrl: "",
          screenshotUrls: ["", "", "", "", ""],
          // Platform availability fields
          web_url_launch: "",
          ios_url_download: "",
          ios_url_launch: "",
          ios_supported: [],
          android_url_download: "",
          android_url_launch: "",
          windows_url_download: "",
          windows_url_launch: "",
          windows_supported: [],
          macos_url_download: "",
          macos_url_launch: "",
          meta_url_download: "",
          meta_url_launch: "",
          ps5_url_download: "",
          xbox_url_download: "",
          nintendo_url_download: ""
        }
      };
      setFormData(emptyNft);
      // Clear errors when opening empty form
      setErrors({});
    }
    // Reset state when modal opens
    setIsSaving(false);
    setShowTxAlert(false);
    setTxError(null);
    setCurrentStep(1);
    setIsCustomizingUrls(false);
  }, [nft, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Check if the field belongs to platform availability
    const platformMatch = name.match(/^(web|ios|android|windows|macos|meta|ps5|xbox|nintendo)_(url_download|url_launch|supported)$/);

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
      if ((fieldKey === 'url_download' || fieldKey === 'url_launch') && value && value.startsWith('http') && !validateUrl(value)) {
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
       // Handle other nested metadata fields (descriptionUrl, marketingUrl, etc.)
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
       if ((metadataField === 'descriptionUrl' || metadataField === 'marketingUrl' || metadataField === 'iconUrl') && value && !validateUrl(value)) {
          setErrors(prev => ({ ...prev, [name]: URL_ERROR_MESSAGE }));
       } else if (metadataField === 'tokenContractAddress' && value && !validateCaipAddress(value)) {
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

  // Validate fields for the current step
  const validateStep = (step: WizardStep): boolean => {
    const stepFieldsToValidate = STEP_FIELDS[step]; // STEP_FIELDS might need adjustment if field names changed drastically
    const stepErrors: Record<string, string> = {};
    
    // Special validation for Step 4: Platform Availability
    if (step === 4) {
      const platforms = formData.metadata?.platforms;
      log("[validateStep 4] Platforms data:", platforms); // Use log()

      const hasAtLeastOnePlatform = platforms && Object.keys(platforms).length > 0 && 
        Object.values(platforms).some(details => 
          (details?.url_download && details.url_download.trim() !== '') || 
          (details?.url_launch && details.url_launch.trim() !== '')
        );

      if (!hasAtLeastOnePlatform) {
        // Use a general key for this step-level error
        stepErrors['metadata.platforms'] = "At least one platform URL (Download or Launch) must be provided.";
      }

      // Validate individual platform URLs (only if http/https)
      if (platforms) {
        Object.entries(platforms).forEach(([platformKey, details]) => {
          const pKey = platformKey as keyof Platforms; // Type assertion
          if (details?.url_download && details.url_download.startsWith('http') && !validateUrl(details.url_download)) {
            stepErrors[`metadata.platforms.${pKey}.url_download`] = URL_ERROR_MESSAGE;
          }
          if (details?.url_launch && details.url_launch.startsWith('http') && !validateUrl(details.url_launch)) {
            stepErrors[`metadata.platforms.${pKey}.url_launch`] = URL_ERROR_MESSAGE;
          }
          // Add validation for 'supported' field format if necessary
        });
      }

      log("[validateStep 4] hasAtLeastOnePlatform:", hasAtLeastOnePlatform); // Use log()
      log("[validateStep 4] Calculated stepErrors:", stepErrors); // Use log()

    }
    
    // Validate each field listed in STEP_FIELDS (excluding step 4 fields handled above)
    if (step !== 4) {
      stepFieldsToValidate.forEach(field => {
         // Handle nested fields (metadata.field)
        if (field.startsWith('metadata.')) {
          const metadataField = field.split('.')[1];
          const value = formData.metadata?.[metadataField as keyof typeof formData.metadata];

          // Simplified validation based on field name
          switch(metadataField) {
            case 'descriptionUrl':
            case 'marketingUrl':
            case 'iconUrl':
              if (!value || !validateUrl(value as string)) {
                stepErrors[field] = URL_ERROR_MESSAGE;
              }
              break;
            case 'tokenContractAddress':
              if (value && !validateCaipAddress(value as string)) {
                stepErrors[field] = CONTRACT_ERROR_MESSAGE;
              }
              break;
            case 'screenshotUrls':
              const screenshots = value as string[];
              if (!screenshots?.[0] || !validateUrl(screenshots[0])) {
                stepErrors['metadata.screenshotUrls.0'] = URL_ERROR_MESSAGE; // Use specific key for first error
              }
              screenshots?.slice(1).forEach((url, index) => {
                if (url && !validateUrl(url)) {
                  stepErrors[`metadata.screenshotUrls.${index + 1}`] = URL_ERROR_MESSAGE;
                }
              });
              break;
             // Platform fields are handled in the step === 4 block above
          }
        } else {
           // Validate registry fields (top level)
          const value = formData[field as keyof WizardFormData];
          switch(field) {
            case 'name':
              if (!validateName(value as string)) stepErrors.name = NAME_ERROR_MESSAGE;
              break;
            case 'version':
              if (!validateVersion(value as string)) stepErrors.version = VERSION_ERROR_MESSAGE;
              break;
            case 'did':
              if (!validateDid(value as string)) stepErrors.did = DID_ERROR_MESSAGE;
              break;
            case 'dataUrl':
            case 'iwpsPortalUri':
              if (!validateUrl(value as string)) stepErrors[field] = URL_ERROR_MESSAGE;
              break;
            case 'agentApiUri':
              if (value && !validateUrl(value as string)) stepErrors.agentApiUri = URL_ERROR_MESSAGE;
              break;
            case 'contractAddress':
              if (value && !validateCaipAddress(value as string)) stepErrors.contractAddress = CONTRACT_ERROR_MESSAGE;
              break;
          }
        }
      });
    }
    
    // Update errors state with current step errors
    setErrors(stepErrors);
    
    // Return true if there are no errors for the current step
    const isValid = Object.keys(stepErrors).length === 0;
    log(`[validateStep ${step}] Returning:`, isValid); // Use log()
    return isValid;
  };

  // Handle next button click - validate current step before proceeding
  const handleNextStep = () => {
    log(`[handleNextStep] Called for step ${currentStep}`); // Use log()
    
    log(`[handleNextStep] Calling validateStep(${currentStep})`);
    log(`[handleNextStep] Calling validateStep(${currentStep})`); // Use log()
    if (validateStep(currentStep)) {
      log(`[handleNextStep] validateStep(${currentStep}) returned true, advancing step.`); // Use log()
      setCurrentStep(prev => {
        const nextStep = prev + 1;
        return (nextStep > 5 ? 5 : nextStep) as WizardStep;
      });
    }
    else {
      log(`[handleNextStep] validateStep(${currentStep}) returned false, not advancing.`); // Use log()
    }
  };

  // Handle back button click
  const handlePrevStep = () => {
    setCurrentStep(prev => {
      const prevStep = prev - 1;
      return (prevStep < 1 ? 1 : prevStep) as WizardStep;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If on step 1 and not customizing URLs, move to the next step
    if (currentStep === 1 && !isCustomizingUrls) {
      handleNextStep();
      return;
    }
    
    // In step 1 with customized URLs, or in final step, proceed with registration
    if (currentStep === 1 || currentStep === 5) {
      // Validate fields for the current step
      if (!validateStep(currentStep)) {
        return;
      }
      
      // If we're at step 1 with custom URLs, validate all required fields manually
      if (currentStep === 1) {
        // Required fields for registration (agentApiUri is optional)
        const requiredFields = ['name', 'version', 'did', 'dataUrl', 'iwpsPortalUri'];
        const missingRequired = requiredFields.filter(field => !formData[field as keyof WizardFormData]);
        
        if (missingRequired.length > 0) {
          console.error(`Missing required fields: ${missingRequired.join(', ')}`);
          return;
        }
        
        // Check for validation errors in the current step
        const fieldsToValidate = STEP_FIELDS[1];
        const hasErrors = fieldsToValidate.some(field => field in errors);
        if (hasErrors) {
          return;
        }
      }
      
      setIsSaving(true);
      setShowTxAlert(true);
      setTxError(null);
      
      try {
        // Create the NFT object with the custom URLs flag
        const nftToSubmit = wizardFormToNft(formData);
        // Add isCustomUrls flag to indicate if user is using custom URLs
        (nftToSubmit as any).isCustomUrls = isCustomizingUrls;
        
        await onSave(nftToSubmit);
        setShowTxAlert(false); // Explicitly clear alert state on success
      } catch (error) {
        console.error("Error registering app:", error);
        setShowTxAlert(false);
        
        // Display the error to the user
        let errorMessage = "Failed to register app";
        
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
      return;
    }
    
    // For other steps, just move to the next step
    handleNextStep();
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
              <Label htmlFor="marketingUrl">Marketing URL</Label>
              <Textarea
                id="marketingUrl"
                name="metadata.marketingUrl"
                value={formData.metadata?.marketingUrl || ""}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata!,
                      marketingUrl: e.target.value
                    }
                  }));
                }}
                onBlur={() => {
                  // Validation happens on blur
                  if (formData.metadata?.marketingUrl && !validateUrl(formData.metadata.marketingUrl)) {
                    setErrors(prev => ({ 
                      ...prev, 
                      'metadata.marketingUrl': URL_ERROR_MESSAGE
                    }));
                  } else if (formData.metadata?.marketingUrl) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors['metadata.marketingUrl'];
                      return newErrors;
                    });
                  }
                }}
                placeholder={URL_PLACEHOLDER}
                required
                className={`min-h-[80px] ${errors['metadata.marketingUrl'] ? "border-red-500" : ""}`}
              />
              {errors['metadata.marketingUrl'] && (
                <p className="text-red-500 text-sm mt-1">{errors['metadata.marketingUrl']}</p>
              )}
              <p className="text-xs text-slate-500">
                Link to your app's website, landing page, or marketing materials.
              </p>
              
              {/* URL Validator for Marketing */}
              {validateUrl(formData.metadata?.marketingUrl || '') && (
                <UrlValidator 
                  url={formData.metadata?.marketingUrl || ''} 
                />
              )}
            </div>

            {/* Token Contract Address */}
            <div className="grid gap-2">
              <Label htmlFor="tokenContractAddress">Token Contract Address (Optional)</Label>
              <Input
                id="tokenContractAddress"
                name="metadata.tokenContractAddress"
                value={formData.metadata?.tokenContractAddress || ""}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata!,
                      tokenContractAddress: e.target.value
                    }
                  }));
                }}
                placeholder={CONTRACT_PLACEHOLDER}
                className={errors['metadata.tokenContractAddress'] ? "border-red-500" : ""}
              />
              {errors['metadata.tokenContractAddress'] && (
                <p className="text-red-500 text-sm mt-1">{errors['metadata.tokenContractAddress']}</p>
              )}
              <p className="text-xs text-slate-500">
                If your app uses a token, enter its contract address here.
              </p>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="grid gap-4">
            {/* Icon URL */}
            <div className="grid gap-2 mb-4">
              <Label htmlFor="iconUrl">Icon URL</Label>
              <Textarea
                id="iconUrl"
                name="metadata.iconUrl"
                value={formData.metadata?.iconUrl || ""}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata!,
                      iconUrl: e.target.value
                    }
                  }));
                }}
                onBlur={() => {
                  // Validation happens on blur
                  if (formData.metadata?.iconUrl && !validateUrl(formData.metadata.iconUrl)) {
                    setErrors(prev => ({ 
                      ...prev, 
                      'metadata.iconUrl': URL_ERROR_MESSAGE
                    }));
                  } else if (formData.metadata?.iconUrl) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors['metadata.iconUrl'];
                      return newErrors;
                    });
                  }
                }}
                placeholder={URL_PLACEHOLDER}
                required
                className={`min-h-[80px] ${errors['metadata.iconUrl'] ? "border-red-500" : ""}`}
              />
              {errors['metadata.iconUrl'] && (
                <p className="text-red-500 text-sm mt-1">{errors['metadata.iconUrl']}</p>
              )}
              <p className="text-xs text-slate-500">
                Link to your app's icon image. Square format (1024x1024) is recommended.
              </p>
              
              {/* Icon URL Validator and Preview */}
              {validateUrl(formData.metadata?.iconUrl || '') && (
                <>
                  <UrlValidator 
                    url={formData.metadata?.iconUrl || ''} 
                  />
                  <ImagePreview 
                    url={formData.metadata?.iconUrl || ''} 
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

              {formData.metadata?.screenshotUrls.map((url, index) => (
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
                  />
                  {errors[`metadata.screenshotUrls.${index}`] && (
                    <p className="text-red-500 text-sm mt-1">{errors[`metadata.screenshotUrls.${index}`]}</p>
                  )}
                  {index === 0 && (
                    <p className="text-xs text-slate-500">
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
                  <p className="text-sm font-medium">{errors['metadata.platforms']}</p>
                </div>
              </div>
            )}
            
            {/* Web Platform */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">Web Platform</h3>
              <div className="grid gap-2">
                <Label htmlFor="web_url_launch">Launch URL</Label>
                <Textarea
                  id="web_url_launch" // Name matches the flat field for handleChange
                  name="web_url_launch"
                  value={formData.metadata?.platforms?.web?.url_launch || ''}
                  onChange={handleChange}
                  placeholder="https://example.com/app"
                  className={`min-h-[70px] ${errors['metadata.platforms.web.url_launch'] ? "border-red-500" : ""}`}
                />
                {errors['metadata.platforms.web.url_launch'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.web.url_launch']}</p>
                )}
                <p className="text-xs text-slate-500">
                  URL to launch your web application
                </p>
              </div>
            </div>
            
            {/* iOS Platform */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">iOS Platform</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ios_url_download">Download URL</Label>
                  <Textarea
                    id="ios_url_download"
                    name="ios_url_download"
                    value={formData.metadata?.platforms?.ios?.url_download || ''}
                    onChange={handleChange}
                    placeholder="https://apps.apple.com/app/id123456789"
                    className={`min-h-[70px] ${errors['metadata.platforms.ios.url_download'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.ios.url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.ios.url_download']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    App Store URL to download your iOS app
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="ios_url_launch">Launch URL (Optional)</Label>
                  <Textarea
                    id="ios_url_launch"
                    name="ios_url_launch"
                    value={formData.metadata?.platforms?.ios?.url_launch || ''}
                    onChange={handleChange}
                    placeholder="https://example.com/app or custom-scheme://"
                    className={`min-h-[70px] ${errors['metadata.platforms.ios.url_launch'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.platforms.ios.url_launch'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.ios.url_launch']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Deep link or URL to launch your iOS app
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="ios_supported">Supported Devices (Optional)</Label>
                  <Input
                    id="ios_supported"
                    name="ios_supported" // Name needs parsing in handleChange
                    value={(formData.metadata?.platforms?.ios?.supported || []).join(', ')}
                    onChange={handleChange} // Need special handling for array conversion
                    placeholder="iPhone, iPad, VisionPro"
                    className={errors['metadata.platforms.ios.supported'] ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-slate-500">
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
                  <Label htmlFor="android_url_download">Download URL</Label>
                  <Textarea
                    id="android_url_download"
                    name="android_url_download"
                    value={formData.metadata?.platforms?.android?.url_download || ''}
                    onChange={handleChange}
                    placeholder="https://play.google.com/store/apps/details?id=com.example.app"
                    className={`min-h-[70px] ${errors['metadata.platforms.android.url_download'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.android.url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.android.url_download']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Google Play Store URL to download your Android app
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="android_url_launch">Launch URL (Optional)</Label>
                  <Textarea
                    id="android_url_launch"
                    name="android_url_launch"
                    value={formData.metadata?.platforms?.android?.url_launch || ''}
                    onChange={handleChange}
                    placeholder="https://example.com/app or app://launch"
                    className={`min-h-[70px] ${errors['metadata.platforms.android.url_launch'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.platforms.android.url_launch'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.android.url_launch']}</p>
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
                  <Label htmlFor="windows_url_download">Download URL</Label>
                  <Textarea
                    id="windows_url_download"
                    name="windows_url_download"
                    value={formData.metadata?.platforms?.windows?.url_download || ''}
                    onChange={handleChange}
                    placeholder="https://apps.microsoft.com/store/detail/yourapp/XXXXXXXX"
                    className={`min-h-[70px] ${errors['metadata.platforms.windows.url_download'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.windows.url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.windows.url_download']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Microsoft Store or website URL to download your Windows app
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="windows_url_launch">Launch URL (Optional)</Label>
                  <Textarea
                    id="windows_url_launch"
                    name="windows_url_launch"
                    value={formData.metadata?.platforms?.windows?.url_launch || ''}
                    onChange={handleChange}
                    placeholder="oma3://launch"
                    className={`min-h-[70px] ${errors['metadata.platforms.windows.url_launch'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.platforms.windows.url_launch'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.windows.url_launch']}</p>
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
                  <Label htmlFor="macos_url_download">Download URL</Label>
                  <Textarea
                    id="macos_url_download"
                    name="macos_url_download"
                    value={formData.metadata?.platforms?.macos?.url_download || ''}
                    onChange={handleChange}
                    placeholder="https://apps.apple.com/app/id123456789?mt=12"
                    className={`min-h-[70px] ${errors['metadata.platforms.macos.url_download'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.macos.url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.macos.url_download']}</p>
                  )}
                  {/* ... help text ... */}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="macos_url_launch">Launch URL (Optional)</Label>
                  <Textarea
                    id="macos_url_launch"
                    name="macos_url_launch"
                    value={formData.metadata?.platforms?.macos?.url_launch || ''}
                    onChange={handleChange}
                    placeholder="oma3://launch"
                    className={`min-h-[70px] ${errors['metadata.platforms.macos.url_launch'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.macos.url_launch'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.macos.url_launch']}</p>
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
                  <Label htmlFor="meta_url_download">Download URL</Label>
                  <Textarea
                    id="meta_url_download"
                    name="meta_url_download"
                    value={formData.metadata?.platforms?.meta?.url_download || ''}
                    onChange={handleChange}
                    placeholder="https://www.meta.com/experiences/1234567890"
                    className={`min-h-[70px] ${errors['metadata.platforms.meta.url_download'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.meta.url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.meta.url_download']}</p>
                  )}
                  {/* ... help text ... */}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="meta_url_launch">Launch URL (Optional)</Label>
                  <Textarea
                    id="meta_url_launch"
                    name="meta_url_launch"
                    value={formData.metadata?.platforms?.meta?.url_launch || ''}
                    onChange={handleChange}
                    placeholder="oculus://store/1234567890"
                    className={`min-h-[70px] ${errors['metadata.platforms.meta.url_launch'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.platforms.meta.url_launch'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.meta.url_launch']}</p>
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
                  <Label htmlFor="ps5_url_download">Download URL</Label>
                  <Textarea
                    id="ps5_url_download"
                    name="ps5_url_download"
                    value={formData.metadata?.platforms?.ps5?.url_download || ''}
                    onChange={handleChange}
                    placeholder="https://store.playstation.com/en-us/product/UP9000-CUSA12345_00-YOURGAME0000000"
                    className={`min-h-[70px] ${errors['metadata.platforms.ps5.url_download'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.platforms.ps5.url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.ps5.url_download']}</p>
                  )}
                </div>
              </div>
              {/* ... Xbox ... */}
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                 <h4 className="text-sm font-medium mb-2">Xbox</h4>
                <div className="grid gap-2">
                  <Label htmlFor="xbox_url_download">Download URL</Label>
                  <Textarea
                    id="xbox_url_download"
                    name="xbox_url_download"
                    value={formData.metadata?.platforms?.xbox?.url_download || ''}
                    onChange={handleChange}
                    placeholder="https://www.microsoft.com/store/apps/9NBLGGH4R315"
                    className={`min-h-[70px] ${errors['metadata.platforms.xbox.url_download'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.xbox.url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.xbox.url_download']}</p>
                  )}
                </div>
              </div>
              {/* ... Nintendo Switch ... */}
              <div>
                 <h4 className="text-sm font-medium mb-2">Nintendo Switch</h4>
                <div className="grid gap-2">
                  <Label htmlFor="nintendo_url_download">Download URL</Label>
                  <Textarea
                    id="nintendo_url_download"
                    name="nintendo_url_download"
                    value={formData.metadata?.platforms?.nintendo?.url_download || ''}
                    onChange={handleChange}
                    placeholder="https://www.nintendo.com/store/products/your-game-name-switch/"
                    className={`min-h-[70px] ${errors['metadata.platforms.nintendo.url_download'] ? "border-red-500" : ""}`}
                  />
                   {errors['metadata.platforms.nintendo.url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.platforms.nintendo.url_download']}</p>
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
            <p className="font-medium mb-2">Review your app details</p>
            
            {/* Registry information */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Registry Information</h3>
              <div className="space-y-2">
                <div><span className="font-medium">Name:</span> {formData.name}</div>
                <div><span className="font-medium">Version:</span> {formData.version}</div>
                <div><span className="font-medium">DID:</span> {formData.did}</div>
                <div className="break-all"><span className="font-medium">Data URL:</span> {formData.dataUrl}</div>
                <div className="break-all"><span className="font-medium">IWPS Portal URI:</span> {formData.iwpsPortalUri}</div>
                {formData.agentApiUri && (
                  <div className="break-all"><span className="font-medium">Agent API URI:</span> {formData.agentApiUri}</div>
                )}
                {formData.contractAddress && (
                  <div className="break-all"><span className="font-medium">Contract Address:</span> {formData.contractAddress}</div>
                )}
              </div>
            </div>
            
            {/* Metadata information */} 
             <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                {/* ... Other metadata fields ... */}
            </div>
            
            {/* Platform Availability */}
            <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-2">Platform Availability</h3>
              {hasAnyPlatformData ? (
                <div className="space-y-3">
                  {Object.entries(platforms).map(([key, details]) => (
                    details && (details.url_download || details.url_launch) ? (
                      <div key={key}>
                        <span className="font-medium capitalize">{key}:</span>
                        <div className="mt-1 space-y-1">
                          {details.url_download && (
                            <div className="break-all text-xs">Download URL: {details.url_download}</div>
                          )}
                          {details.url_launch && (
                            <div className="break-all text-xs">Launch URL: {details.url_launch}</div>
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
            
            {/* Transaction information */}
            <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm">
              <p className="font-medium text-orange-600 dark:text-orange-400">
                You will need to sign two separate transactions:
              </p>
              <ol className="list-decimal list-inside mt-1">
                <li className="mb-1">Registry transaction: To register your app identity and basic information</li>
                <li>Metadata transaction: To store your app's additional metadata (descriptions, images, platform availability)</li>
              </ol>
              <p className="text-xs text-slate-500 mt-2">
                Note: These will happen as separate signature requests. Please approve both to complete the registration process.
              </p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Improved validation for current step
  const isCurrentStepValid = () => {
    
    // For step 1, also check if required fields have values
    if (currentStep === 1) {
      const stepFieldsToCheck = STEP_FIELDS[1];
      // Check for format errors in Step 1 fields
      const hasValidationErrors = stepFieldsToCheck.some(field => field in errors);
      
      // Note: agentApiUri is NOT in the required fields list since it's optional
      const requiredFields = ['name', 'version', 'did', 'dataUrl', 'iwpsPortalUri'];
      const hasEmptyRequiredField = requiredFields.some(field => !formData[field as keyof WizardFormData]);
      
      // Disable button if Step 1 has format errors OR missing required fields
      return !hasValidationErrors && !hasEmptyRequiredField;
    }
    
    // For steps 2, 3, 4, 5, always return true (don't disable based on validation state here)
    // Validation for these steps happens onClick via validateStep()
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={isOpen ? handleCloseMintModal : undefined}>
      <DialogContent className="w-[95%] max-w-[450px] sm:max-w-[550px] md:max-w-[650px] lg:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Register New App</DialogTitle>
            <DialogDescription>
              Step {currentStep} of 5: {stepTitles[currentStep]}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex justify-between mb-4 mt-2">
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

          {showTxAlert && (
            <TransactionAlert
              title="App Registration Transaction"
              description="Please approve the transaction in your wallet to register your app."
              isMobile={isMobile()}
            />
          )}

          {txError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex gap-2 items-start text-red-700 dark:text-red-400">
                <AlertCircleIcon size={18} className="mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Registration Error</p>
                  <p>{txError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 py-4">
            {renderStepContent()}
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {currentStep > 1 && (
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
                disabled={!isCurrentStepValid() || isSaving}
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