"use client"

import React, { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
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
import { ExternalLinkIcon, EditIcon, AlertCircleIcon, ArrowLeftIcon, ArrowRightIcon, ChevronDown } from "lucide-react"
import { ImagePreview } from "@/components/image-preview"
import { UrlValidator } from "@/components/url-validator"

// Define type for wizard steps
type WizardStep = 1 | 2 | 3 | 4 | 5;

// Group form fields by step for validation
const STEP_FIELDS = {
  1: ['name', 'version', 'did', 'dataUrl', 'iwpsPortalUri', 'agentApiUri', 'contractAddress'],
  2: ['metadata.descriptionUrl', 'metadata.marketingUrl', 'metadata.tokenContractAddress'],
  3: ['metadata.iconUrl', 'metadata.screenshotUrls'],
  4: [
    'metadata.web_url_launch',
    'metadata.ios_url_download', 'metadata.ios_url_launch', 'metadata.ios_supported',
    'metadata.android_url_download', 'metadata.android_url_launch',
    'metadata.windows_url_download', 'metadata.windows_url_launch', 'metadata.windows_supported',
    'metadata.macos_url_download', 'metadata.macos_url_launch',
    'metadata.meta_url_download', 'metadata.meta_url_launch',
    'metadata.ps5_url_download',
    'metadata.xbox_url_download',
    'metadata.nintendo_url_download'
  ],
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
    
    // Metadata fields with defaults
    metadata: {
      descriptionUrl: nft.metadata?.descriptionUrl || "",
      marketingUrl: nft.metadata?.marketingUrl || "",
      tokenContractAddress: nft.metadata?.tokenContractAddress || "",
      iconUrl: nft.metadata?.iconUrl || "",
      screenshotUrls: nft.metadata?.screenshotUrls || ["", "", "", "", ""],
      // Platform availability fields
      web_url_launch: nft.metadata?.web_url_launch || "",
      ios_url_download: nft.metadata?.ios_url_download || "",
      ios_url_launch: nft.metadata?.ios_url_launch || "",
      ios_supported: nft.metadata?.ios_supported || [],
      android_url_download: nft.metadata?.android_url_download || "",
      android_url_launch: nft.metadata?.android_url_launch || "",
      windows_url_download: nft.metadata?.windows_url_download || "",
      windows_url_launch: nft.metadata?.windows_url_launch || "",
      windows_supported: nft.metadata?.windows_supported || [],
      macos_url_download: nft.metadata?.macos_url_download || "",
      macos_url_launch: nft.metadata?.macos_url_launch || "",
      meta_url_download: nft.metadata?.meta_url_download || "",
      meta_url_launch: nft.metadata?.meta_url_launch || "",
      ps5_url_download: nft.metadata?.ps5_url_download || "",
      xbox_url_download: nft.metadata?.xbox_url_download || "",
      nintendo_url_download: nft.metadata?.nintendo_url_download || ""
    }
  };
};

// Helper function to convert from WizardFormData to NFT
const wizardFormToNft = (formData: WizardFormData): NFT => {
  // Extract registry fields
  const { metadata, ...registryFields } = formData;
  
  // Return as NFT
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
    minter: "",
    
    // Metadata fields (nested under metadata)
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
    
    // If changing DID or version and not customizing URLs, handle URL updates
    if ((name === 'did' || name === 'version') && !isCustomizingUrls) {
      // Create a new form data object with the updated field
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
    const stepFieldsToValidate = STEP_FIELDS[step];
    const stepErrors: Record<string, string> = {};
    
    // For platform availability, validate that at least one URL field is provided
    if (step === 4) {
      const urlFields = [
        'metadata.web_url_launch',
        'metadata.ios_url_download', 'metadata.ios_url_launch',
        'metadata.android_url_download', 'metadata.android_url_launch',
        'metadata.windows_url_download', 'metadata.windows_url_launch',
        'metadata.macos_url_download', 'metadata.macos_url_launch',
        'metadata.meta_url_download', 'metadata.meta_url_launch',
        'metadata.ps5_url_download',
        'metadata.xbox_url_download',
        'metadata.nintendo_url_download'
      ];
      
      const hasAtLeastOneUrl = urlFields.some(field => {
        const parts = field.split('.');
        const value = formData.metadata?.[parts[1] as keyof typeof formData.metadata];
        return typeof value === 'string' && value.trim() !== '';
      });
      
      if (!hasAtLeastOneUrl) {
        stepErrors['metadata.platformAvailability'] = "At least one platform URL must be provided";
      }
    }
    
    // Validate each field in the current step
    stepFieldsToValidate.forEach(field => {
      // Handle nested fields (metadata.field)
      if (field.startsWith('metadata.')) {
        const metadataField = field.split('.')[1];
        
        // Validate metadata fields
        switch(metadataField) {
          case 'descriptionUrl':
            if (!formData.metadata?.descriptionUrl || !validateUrl(formData.metadata.descriptionUrl)) {
              stepErrors['metadata.descriptionUrl'] = URL_ERROR_MESSAGE;
            }
            break;
            
          case 'marketingUrl':
            if (!formData.metadata?.marketingUrl || !validateUrl(formData.metadata.marketingUrl)) {
              stepErrors['metadata.marketingUrl'] = URL_ERROR_MESSAGE;
            }
            break;
            
          case 'tokenContractAddress':
            if (formData.metadata?.tokenContractAddress && !validateCaipAddress(formData.metadata.tokenContractAddress)) {
              stepErrors['metadata.tokenContractAddress'] = CONTRACT_ERROR_MESSAGE;
            }
            break;
            
          case 'iconUrl':
            if (!formData.metadata?.iconUrl || !validateUrl(formData.metadata.iconUrl)) {
              stepErrors['metadata.iconUrl'] = URL_ERROR_MESSAGE;
            }
            break;
            
          case 'screenshotUrls':
            // Validate first screenshot URL (required)
            if (!formData.metadata?.screenshotUrls?.[0] || !validateUrl(formData.metadata?.screenshotUrls[0])) {
              stepErrors['metadata.screenshotUrls.0'] = URL_ERROR_MESSAGE;
            }
            
            // Validate optional screenshots if provided
            formData.metadata?.screenshotUrls.slice(1).forEach((url, index) => {
              if (url && !validateUrl(url)) {
                stepErrors[`metadata.screenshotUrls.${index + 1}`] = URL_ERROR_MESSAGE;
              }
            });
            break;
            
          // Platform availability URL validations
          // Only validate fields that start with "http" to allow platform-specific schemes
          case 'web_url_launch':
          case 'ios_url_download':
          case 'ios_url_launch':
          case 'android_url_download':
          case 'android_url_launch':
          case 'windows_url_download':
          case 'windows_url_launch':
          case 'macos_url_download':
          case 'macos_url_launch':
          case 'meta_url_download':
          case 'meta_url_launch':
          case 'ps5_url_download':
          case 'xbox_url_download':
          case 'nintendo_url_download':
            const value = formData.metadata?.[metadataField as keyof typeof formData.metadata];
            if (
              typeof value === 'string' && 
              value.trim() !== '' && 
              value.startsWith('http') && 
              !validateUrl(value)
            ) {
              stepErrors[`metadata.${metadataField}`] = URL_ERROR_MESSAGE;
            }
            break;
        }
      } else {
        // Validate registry fields (top level)
        switch(field) {
          case 'name':
            if (!validateName(formData.name)) {
              stepErrors.name = NAME_ERROR_MESSAGE;
            }
            break;
            
          case 'version':
            if (!validateVersion(formData.version)) {
              stepErrors.version = VERSION_ERROR_MESSAGE;
            }
            break;
            
          case 'did':
            if (!validateDid(formData.did)) {
              stepErrors.did = DID_ERROR_MESSAGE;
            }
            break;
            
          case 'dataUrl':
            if (!validateUrl(formData.dataUrl)) {
              stepErrors.dataUrl = URL_ERROR_MESSAGE;
            }
            break;
            
          case 'iwpsPortalUri':
            if (!validateUrl(formData.iwpsPortalUri)) {
              stepErrors.iwpsPortalUri = URL_ERROR_MESSAGE;
            }
            break;
            
          case 'agentApiUri':
            // Validate only if provided (it's optional)
            if (formData.agentApiUri && !validateUrl(formData.agentApiUri)) {
              stepErrors.agentApiUri = URL_ERROR_MESSAGE;
            }
            break;
            
          case 'contractAddress':
            // Optional field - only validate if not empty
            if (formData.contractAddress && !validateCaipAddress(formData.contractAddress)) {
              stepErrors.contractAddress = CONTRACT_ERROR_MESSAGE;
            }
            break;
        }
      }
    });
    
    // Update errors state with current step errors
    setErrors(stepErrors);
    
    // Return true if there are no errors for the current step
    return Object.keys(stepErrors).length === 0;
  };

  // Handle next button click - validate current step before proceeding
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => {
        const nextStep = prev + 1;
        return (nextStep > 5 ? 5 : nextStep) as WizardStep;
      });
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
        await onSave(wizardFormToNft(formData));
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
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Configure which platforms your application is available on. At least one platform URL is required.
            </p>
            
            {errors['metadata.platformAvailability'] && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex gap-2 items-start text-red-700 dark:text-red-400">
                  <AlertCircleIcon size={18} className="mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{errors['metadata.platformAvailability']}</p>
                </div>
              </div>
            )}
            
            {/* Web Platform */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">Web Platform</h3>
              <div className="grid gap-2">
                <Label htmlFor="web_url_launch">Launch URL</Label>
                <Textarea
                  id="web_url_launch"
                  name="web_url_launch"
                  value={formData.metadata?.web_url_launch || ''}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      metadata: {
                        ...prev.metadata!,
                        web_url_launch: e.target.value
                      }
                    }));
                  }}
                  onBlur={() => {
                    const url = formData.metadata?.web_url_launch || '';
                    if (url && url.startsWith('http') && !validateUrl(url)) {
                      setErrors(prev => ({ 
                        ...prev, 
                        'metadata.web_url_launch': URL_ERROR_MESSAGE
                      }));
                    } else {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors['metadata.web_url_launch'];
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="https://example.com/app"
                  className={`min-h-[70px] ${errors['metadata.web_url_launch'] ? "border-red-500" : ""}`}
                />
                {errors['metadata.web_url_launch'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['metadata.web_url_launch']}</p>
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
                    value={formData.metadata?.ios_url_download || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          ios_url_download: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.ios_url_download || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.ios_url_download': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.ios_url_download'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="https://apps.apple.com/app/id123456789"
                    className={`min-h-[70px] ${errors['metadata.ios_url_download'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.ios_url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.ios_url_download']}</p>
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
                    value={formData.metadata?.ios_url_launch || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          ios_url_launch: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.ios_url_launch || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.ios_url_launch': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.ios_url_launch'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="https://example.com/app or custom-scheme://"
                    className={`min-h-[70px] ${errors['metadata.ios_url_launch'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.ios_url_launch'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.ios_url_launch']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Deep link or URL to launch your iOS app
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="ios_supported">Supported Devices (Optional)</Label>
                  <Input
                    id="ios_supported"
                    name="ios_supported"
                    value={(formData.metadata?.ios_supported || []).join(', ')}
                    onChange={(e) => {
                      const devices = e.target.value.split(',').map(device => device.trim()).filter(Boolean);
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          ios_supported: devices
                        }
                      }));
                    }}
                    placeholder="iPhone, iPad, VisionPro"
                    className={errors['metadata.ios_supported'] ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-slate-500">
                    Comma-separated list of supported iOS devices
                  </p>
                </div>
              </div>
            </div>
            
            {/* Android Platform */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">Android Platform</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="android_url_download">Download URL</Label>
                  <Textarea
                    id="android_url_download"
                    name="android_url_download"
                    value={formData.metadata?.android_url_download || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          android_url_download: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.android_url_download || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.android_url_download': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.android_url_download'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="https://play.google.com/store/apps/details?id=com.example.app"
                    className={`min-h-[70px] ${errors['metadata.android_url_download'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.android_url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.android_url_download']}</p>
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
                    value={formData.metadata?.android_url_launch || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          android_url_launch: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.android_url_launch || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.android_url_launch': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.android_url_launch'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="https://example.com/app or app://launch"
                    className={`min-h-[70px] ${errors['metadata.android_url_launch'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.android_url_launch'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.android_url_launch']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Deep link or URL to launch your Android app
                  </p>
                </div>
              </div>
            </div>
            
            {/* Windows Platform */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">Windows Platform</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="windows_url_download">Download URL</Label>
                  <Textarea
                    id="windows_url_download"
                    name="windows_url_download"
                    value={formData.metadata?.windows_url_download || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          windows_url_download: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.windows_url_download || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.windows_url_download': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.windows_url_download'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="https://apps.microsoft.com/store/detail/yourapp/XXXXXXXX"
                    className={`min-h-[70px] ${errors['metadata.windows_url_download'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.windows_url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.windows_url_download']}</p>
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
                    value={formData.metadata?.windows_url_launch || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          windows_url_launch: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.windows_url_launch || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.windows_url_launch': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.windows_url_launch'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="oma3://launch"
                    className={`min-h-[70px] ${errors['metadata.windows_url_launch'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.windows_url_launch'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.windows_url_launch']}</p>
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
                    value={(formData.metadata?.windows_supported || []).join(', ')}
                    onChange={(e) => {
                      const architectures = e.target.value.split(',').map(arch => arch.trim()).filter(Boolean);
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          windows_supported: architectures
                        }
                      }));
                    }}
                    placeholder="x64, arm64"
                    className={errors['metadata.windows_supported'] ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-slate-500">
                    Comma-separated list of supported Windows architectures
                  </p>
                </div>
              </div>
            </div>
            
            {/* macOS Platform */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">macOS Platform</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="macos_url_download">Download URL</Label>
                  <Textarea
                    id="macos_url_download"
                    name="macos_url_download"
                    value={formData.metadata?.macos_url_download || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          macos_url_download: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.macos_url_download || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.macos_url_download': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.macos_url_download'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="https://apps.apple.com/app/id123456789?mt=12"
                    className={`min-h-[70px] ${errors['metadata.macos_url_download'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.macos_url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.macos_url_download']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Mac App Store or website URL to download your macOS app
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="macos_url_launch">Launch URL (Optional)</Label>
                  <Textarea
                    id="macos_url_launch"
                    name="macos_url_launch"
                    value={formData.metadata?.macos_url_launch || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          macos_url_launch: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.macos_url_launch || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.macos_url_launch': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.macos_url_launch'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="oma3://launch"
                    className={`min-h-[70px] ${errors['metadata.macos_url_launch'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.macos_url_launch'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.macos_url_launch']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Protocol handler or URL to launch your macOS app
                  </p>
                </div>
              </div>
            </div>
            
            {/* Meta Quest Platform */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">Meta Quest Platform</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="meta_url_download">Download URL</Label>
                  <Textarea
                    id="meta_url_download"
                    name="meta_url_download"
                    value={formData.metadata?.meta_url_download || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          meta_url_download: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.meta_url_download || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.meta_url_download': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.meta_url_download'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="https://www.meta.com/experiences/1234567890"
                    className={`min-h-[70px] ${errors['metadata.meta_url_download'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.meta_url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.meta_url_download']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Meta Quest Store URL to download your VR app
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="meta_url_launch">Launch URL (Optional)</Label>
                  <Textarea
                    id="meta_url_launch"
                    name="meta_url_launch"
                    value={formData.metadata?.meta_url_launch || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          meta_url_launch: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.meta_url_launch || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.meta_url_launch': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.meta_url_launch'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="oculus://store/1234567890"
                    className={`min-h-[70px] ${errors['metadata.meta_url_launch'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.meta_url_launch'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.meta_url_launch']}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    URI to launch your Meta Quest app
                  </p>
                </div>
              </div>
            </div>
            
            {/* Game Consoles Section */}
            <div className="border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold mb-3">Game Console Platforms</h3>
              
              {/* PlayStation */}
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium mb-2">PlayStation</h4>
                <div className="grid gap-2">
                  <Label htmlFor="ps5_url_download">Download URL</Label>
                  <Textarea
                    id="ps5_url_download"
                    name="ps5_url_download"
                    value={formData.metadata?.ps5_url_download || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          ps5_url_download: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.ps5_url_download || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.ps5_url_download': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.ps5_url_download'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="https://store.playstation.com/en-us/product/UP9000-CUSA12345_00-YOURGAME0000000"
                    className={`min-h-[70px] ${errors['metadata.ps5_url_download'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.ps5_url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.ps5_url_download']}</p>
                  )}
                </div>
              </div>
              
              {/* Xbox */}
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium mb-2">Xbox</h4>
                <div className="grid gap-2">
                  <Label htmlFor="xbox_url_download">Download URL</Label>
                  <Textarea
                    id="xbox_url_download"
                    name="xbox_url_download"
                    value={formData.metadata?.xbox_url_download || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          xbox_url_download: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.xbox_url_download || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.xbox_url_download': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.xbox_url_download'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="https://www.microsoft.com/store/apps/9NBLGGH4R315"
                    className={`min-h-[70px] ${errors['metadata.xbox_url_download'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.xbox_url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.xbox_url_download']}</p>
                  )}
                </div>
              </div>
              
              {/* Nintendo Switch */}
              <div>
                <h4 className="text-sm font-medium mb-2">Nintendo Switch</h4>
                <div className="grid gap-2">
                  <Label htmlFor="nintendo_url_download">Download URL</Label>
                  <Textarea
                    id="nintendo_url_download"
                    name="nintendo_url_download"
                    value={formData.metadata?.nintendo_url_download || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata!,
                          nintendo_url_download: e.target.value
                        }
                      }));
                    }}
                    onBlur={() => {
                      const url = formData.metadata?.nintendo_url_download || '';
                      if (url && url.startsWith('http') && !validateUrl(url)) {
                        setErrors(prev => ({ 
                          ...prev, 
                          'metadata.nintendo_url_download': URL_ERROR_MESSAGE
                        }));
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['metadata.nintendo_url_download'];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="https://www.nintendo.com/store/products/your-game-name-switch/"
                    className={`min-h-[70px] ${errors['metadata.nintendo_url_download'] ? "border-red-500" : ""}`}
                  />
                  {errors['metadata.nintendo_url_download'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['metadata.nintendo_url_download']}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 5:
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
              <h3 className="text-sm font-semibold mb-2">Metadata Information</h3>
              <div className="space-y-2">
                <div className="break-all"><span className="font-medium">Description URL:</span> {formData.metadata?.descriptionUrl || "None"}</div>
                <div className="break-all"><span className="font-medium">Marketing URL:</span> {formData.metadata?.marketingUrl || "None"}</div>
                {formData.metadata?.tokenContractAddress && (
                  <div className="break-all"><span className="font-medium">Token Contract Address:</span> {formData.metadata?.tokenContractAddress}</div>
                )}
                <div className="break-all"><span className="font-medium">Icon URL:</span> {formData.metadata?.iconUrl || "None"}</div>
                
                {/* Screenshot URLs */}
                <div className="mt-2">
                  <div className="font-medium">Screenshot URLs:</div>
                  <ol className="list-decimal list-inside mt-1">
                    {formData.metadata?.screenshotUrls.map((url, index) => (
                      url ? (
                        <li key={index} className="overflow-hidden my-1">
                          <div className="break-all text-xs">{url}</div>
                        </li>
                      ) : null
                    ))}
                  </ol>
                </div>
              </div>
            </div>
            
            {/* Platform Availability */}
            <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-2">Platform Availability</h3>
              <div className="space-y-3">
                {/* Web */}
                {formData.metadata?.web_url_launch && (
                  <div>
                    <span className="font-medium">Web:</span> 
                    <div className="mt-1">
                      <div className="break-all text-xs">Launch URL: {formData.metadata.web_url_launch}</div>
                    </div>
                  </div>
                )}
                
                {/* iOS */}
                {(formData.metadata?.ios_url_download || formData.metadata?.ios_url_launch) && (
                  <div>
                    <span className="font-medium">iOS:</span> 
                    <div className="mt-1 space-y-1">
                      {formData.metadata?.ios_url_download && (
                        <div className="break-all text-xs">Download URL: {formData.metadata.ios_url_download}</div>
                      )}
                      {formData.metadata?.ios_url_launch && (
                        <div className="break-all text-xs">Launch URL: {formData.metadata.ios_url_launch}</div>
                      )}
                      {formData.metadata?.ios_supported && formData.metadata.ios_supported.length > 0 && (
                        <div className="break-all text-xs">Supported: {formData.metadata.ios_supported.join(", ")}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Android */}
                {(formData.metadata?.android_url_download || formData.metadata?.android_url_launch) && (
                  <div>
                    <span className="font-medium">Android:</span> 
                    <div className="mt-1 space-y-1">
                      {formData.metadata?.android_url_download && (
                        <div className="break-all text-xs">Download URL: {formData.metadata.android_url_download}</div>
                      )}
                      {formData.metadata?.android_url_launch && (
                        <div className="break-all text-xs">Launch URL: {formData.metadata.android_url_launch}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Windows */}
                {(formData.metadata?.windows_url_download || formData.metadata?.windows_url_launch) && (
                  <div>
                    <span className="font-medium">Windows:</span> 
                    <div className="mt-1 space-y-1">
                      {formData.metadata?.windows_url_download && (
                        <div className="break-all text-xs">Download URL: {formData.metadata.windows_url_download}</div>
                      )}
                      {formData.metadata?.windows_url_launch && (
                        <div className="break-all text-xs">Launch URL: {formData.metadata.windows_url_launch}</div>
                      )}
                      {formData.metadata?.windows_supported && formData.metadata.windows_supported.length > 0 && (
                        <div className="break-all text-xs">Supported: {formData.metadata.windows_supported.join(", ")}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* macOS */}
                {(formData.metadata?.macos_url_download || formData.metadata?.macos_url_launch) && (
                  <div>
                    <span className="font-medium">macOS:</span> 
                    <div className="mt-1 space-y-1">
                      {formData.metadata?.macos_url_download && (
                        <div className="break-all text-xs">Download URL: {formData.metadata.macos_url_download}</div>
                      )}
                      {formData.metadata?.macos_url_launch && (
                        <div className="break-all text-xs">Launch URL: {formData.metadata.macos_url_launch}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Meta Quest */}
                {(formData.metadata?.meta_url_download || formData.metadata?.meta_url_launch) && (
                  <div>
                    <span className="font-medium">Meta Quest:</span> 
                    <div className="mt-1 space-y-1">
                      {formData.metadata?.meta_url_download && (
                        <div className="break-all text-xs">Download URL: {formData.metadata.meta_url_download}</div>
                      )}
                      {formData.metadata?.meta_url_launch && (
                        <div className="break-all text-xs">Launch URL: {formData.metadata.meta_url_launch}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* PlayStation */}
                {formData.metadata?.ps5_url_download && (
                  <div>
                    <span className="font-medium">PlayStation:</span> 
                    <div className="mt-1">
                      <div className="break-all text-xs">Download URL: {formData.metadata.ps5_url_download}</div>
                    </div>
                  </div>
                )}
                
                {/* Xbox */}
                {formData.metadata?.xbox_url_download && (
                  <div>
                    <span className="font-medium">Xbox:</span> 
                    <div className="mt-1">
                      <div className="break-all text-xs">Download URL: {formData.metadata.xbox_url_download}</div>
                    </div>
                  </div>
                )}
                
                {/* Nintendo Switch */}
                {formData.metadata?.nintendo_url_download && (
                  <div>
                    <span className="font-medium">Nintendo Switch:</span> 
                    <div className="mt-1">
                      <div className="break-all text-xs">Download URL: {formData.metadata.nintendo_url_download}</div>
                    </div>
                  </div>
                )}
                
                {/* No platforms message */}
                {!formData.metadata?.web_url_launch &&
                 !formData.metadata?.ios_url_download && !formData.metadata?.ios_url_launch &&
                 !formData.metadata?.android_url_download && !formData.metadata?.android_url_launch &&
                 !formData.metadata?.windows_url_download && !formData.metadata?.windows_url_launch &&
                 !formData.metadata?.macos_url_download && !formData.metadata?.macos_url_launch &&
                 !formData.metadata?.meta_url_download && !formData.metadata?.meta_url_launch &&
                 !formData.metadata?.ps5_url_download &&
                 !formData.metadata?.xbox_url_download &&
                 !formData.metadata?.nintendo_url_download && (
                  <div className="text-gray-500 italic">No platform availability information provided</div>
                )}
              </div>
            </div>
            
            {/* Transaction information */}
            <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm">
              <p className="font-medium text-orange-600 dark:text-orange-400">
                You will need to sign two separate transactions:
              </p>
              <ol className="list-decimal list-inside mt-1">
                <li className="mb-1">Registry contract: To register your app identity</li>
                <li>Metadata contract: To store your app's metadata</li>
              </ol>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Improved validation for current step
  const isCurrentStepValid = () => {
    const stepFieldsToCheck = STEP_FIELDS[currentStep];
    
    // Check if any field in current step has validation errors
    const hasValidationErrors = stepFieldsToCheck.some(field => field in errors);
    
    // For step 1, also check if required fields have values
    if (currentStep === 1) {
      // Note: agentApiUri is NOT in the required fields list since it's optional
      const requiredFields = ['name', 'version', 'did', 'dataUrl', 'iwpsPortalUri'];
      const hasEmptyRequiredField = requiredFields.some(field => !formData[field as keyof WizardFormData]);
      return !hasValidationErrors && !hasEmptyRequiredField;
    }
    
    return !hasValidationErrors;
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseMintModal} 
                disabled={isSaving}
              >
                Cancel
              </Button>
              
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