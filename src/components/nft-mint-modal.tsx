"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog"
import type { NFT } from "@/types/nft"
import type { WizardFormData } from "@/types/form"
import type { RegistryContractData } from "@/types/registry-contract"
import type { MetadataContractData } from "@/types/metadata-contract"
import {
  MAX_URL_LENGTH,
  MAX_DID_LENGTH,
  MAX_NAME_LENGTH,
  validateVersion,
  validateUrl,
  validateDid,
  validateName,
  validateCaipAddress
} from "@/lib/validation"
import { TransactionAlert } from "@/components/ui/transaction-alert"
import { isMobile } from "@/lib/utils"
import { SELF_HOSTING_DOCS_URL, APP_REGISTRY_METADATA_BASE_URL, IWPS_PORTAL_BASE_URL } from "@/config/app-config"
import { ExternalLinkIcon, EditIcon, AlertCircleIcon, ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

// Define type for wizard steps
type WizardStep = 1 | 2 | 3 | 4;

// Group form fields by step for validation
const STEP_FIELDS = {
  1: ['name', 'version', 'did', 'dataUrl', 'iwpsPortalUri', 'agentApiUri', 'contractAddress'],
  2: ['metadata.descriptionUrl', 'metadata.marketingUrl', 'metadata.tokenContractAddress', 'metadata.iconUrl', 'metadata.screenshotUrls'],
  3: ['availability'], // Will add these fields later
  4: ['final'] // Final confirmation step - no validation needed
};

// Step titles for the wizard
const stepTitles = {
  1: "App Identity & URLs",
  2: "Images & Assets",
  3: "Platform Availability",
  4: "Review & Submit"
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
      descriptionUrl: "",
      marketingUrl: "",
      tokenContractAddress: "",
      iconUrl: "",
      screenshotUrls: ["", "", "", "", ""]
    }
  };
};

// Helper function to convert from WizardFormData to NFT
const wizardFormToNft = (formData: WizardFormData): NFT => {
  // Extract registry fields
  const { metadata, ...registryFields } = formData;
  
  // Return as NFT
  return registryFields as NFT;
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
      screenshotUrls: ["", "", "", "", ""]
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
          screenshotUrls: ["", "", "", "", ""]
        },
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
            version: "Version must be in format X.Y.Z or X.Y where X, Y, and Z are numbers"
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
            [name]: `Valid URL required (max ${MAX_URL_LENGTH} characters)`
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
            did: `Valid DID required (max ${MAX_DID_LENGTH} characters, format: did:method:id)`
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
            name: `Name must be between 1 and ${MAX_NAME_LENGTH} characters`
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
            contractAddress: "Invalid contract address format"
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
    
    // Validate each field in the current step
    stepFieldsToValidate.forEach(field => {
      // Handle nested fields (metadata.field)
      if (field.startsWith('metadata.')) {
        const metadataField = field.split('.')[1];
        
        // Validate metadata fields
        switch(metadataField) {
          case 'descriptionUrl':
            if (!formData.metadata?.descriptionUrl || !validateUrl(formData.metadata.descriptionUrl)) {
              stepErrors['metadata.descriptionUrl'] = `Valid URL required (max ${MAX_URL_LENGTH} characters)`;
            }
            break;
            
          case 'marketingUrl':
            if (!formData.metadata?.marketingUrl || !validateUrl(formData.metadata.marketingUrl)) {
              stepErrors['metadata.marketingUrl'] = `Valid URL required (max ${MAX_URL_LENGTH} characters)`;
            }
            break;
            
          case 'tokenContractAddress':
            if (formData.metadata?.tokenContractAddress && !validateCaipAddress(formData.metadata.tokenContractAddress)) {
              stepErrors['metadata.tokenContractAddress'] = "Invalid contract address format";
            }
            break;
            
          case 'iconUrl':
            if (!formData.metadata?.iconUrl || !validateUrl(formData.metadata.iconUrl)) {
              stepErrors['metadata.iconUrl'] = `Valid URL required (max ${MAX_URL_LENGTH} characters)`;
            }
            break;
            
          case 'screenshotUrls':
            // Validate first screenshot URL (required)
            if (!formData.metadata?.screenshotUrls?.[0] || !validateUrl(formData.metadata?.screenshotUrls[0])) {
              stepErrors['metadata.screenshotUrls.0'] = `Valid URL required (max ${MAX_URL_LENGTH} characters)`;
            }
            
            // Validate optional screenshots if provided
            formData.metadata?.screenshotUrls.slice(1).forEach((url, index) => {
              if (url && !validateUrl(url)) {
                stepErrors[`metadata.screenshotUrls.${index + 1}`] = `Valid URL required (max ${MAX_URL_LENGTH} characters)`;
              }
            });
            break;
        }
      } else {
        // Validate registry fields (top level)
        switch(field) {
          case 'name':
            if (!validateName(formData.name)) {
              stepErrors.name = `Name must be between 1 and ${MAX_NAME_LENGTH} characters`;
            }
            break;
            
          case 'version':
            if (!validateVersion(formData.version)) {
              stepErrors.version = "Version must be in format X.Y.Z or X.Y where X, Y, and Z are numbers";
            }
            break;
            
          case 'did':
            if (!validateDid(formData.did)) {
              stepErrors.did = `Valid DID required (max ${MAX_DID_LENGTH} characters, format: did:method:id)`;
            }
            break;
            
          case 'dataUrl':
            if (!validateUrl(formData.dataUrl)) {
              stepErrors.dataUrl = `Valid URL required (max ${MAX_URL_LENGTH} characters)`;
            }
            break;
            
          case 'iwpsPortalUri':
            if (!validateUrl(formData.iwpsPortalUri)) {
              stepErrors.iwpsPortalUri = `Valid URL required (max ${MAX_URL_LENGTH} characters)`;
            }
            break;
            
          case 'agentApiUri':
            // Validate only if provided (it's optional)
            if (formData.agentApiUri && !validateUrl(formData.agentApiUri)) {
              stepErrors.agentApiUri = `Valid URL required (max ${MAX_URL_LENGTH} characters)`;
            }
            break;
            
          case 'contractAddress':
            // Optional field - only validate if not empty
            if (formData.contractAddress && !validateCaipAddress(formData.contractAddress)) {
              stepErrors.contractAddress = "Invalid contract address format";
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
        return (nextStep > 4 ? 4 : nextStep) as WizardStep;
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
    if (currentStep === 1 || currentStep === 4) {
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
                placeholder={`Maximum of ${MAX_NAME_LENGTH} characters`}
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
                placeholder="Format: x.y.z or x.y (numbers only)"
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
                placeholder={`did:method:id (max ${MAX_DID_LENGTH} chars)`}
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
                    placeholder={`Valid URL (max ${MAX_URL_LENGTH} chars)`}
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
                    placeholder={`Valid URL (max ${MAX_URL_LENGTH} chars)`}
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
                placeholder={`Valid URL (max ${MAX_URL_LENGTH} chars)`}
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
                placeholder="CAIP-2 compliant smart contract address"
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
          <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
            <p className="font-medium mb-2">Images & Assets</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Upload images and assets related to your application.
            </p>
            
            {/* Placeholder for image upload */}
            <div className="space-y-2">
              <p className="text-sm text-slate-500 italic">
                Image upload functionality will be added here.
              </p>
              {/* We'll add image upload fields here in the future */}
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
            <p className="font-medium mb-2">Platform Availability</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Configure which platforms your application is available on.
            </p>
            
            {/* Placeholder for platform availability checkboxes */}
            <div className="space-y-2">
              <p className="text-sm text-slate-500 italic">
                Platform availability options will be added here.
              </p>
              {/* We'll add availability fields here in the future */}
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
            <p className="font-medium mb-2">Review your app details</p>
            
            {/* Registry information */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Registry Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Name:</span> {formData.name}</div>
                <div><span className="font-medium">Version:</span> {formData.version}</div>
                <div><span className="font-medium">DID:</span> {formData.did}</div>
                <div><span className="font-medium">Data URL:</span> {formData.dataUrl}</div>
                <div><span className="font-medium">IWPS Portal URI:</span> {formData.iwpsPortalUri}</div>
                {formData.agentApiUri && (
                  <div><span className="font-medium">Agent API URI:</span> {formData.agentApiUri}</div>
                )}
                {formData.contractAddress && (
                  <div><span className="font-medium">Contract Address:</span> {formData.contractAddress}</div>
                )}
              </div>
            </div>
            
            {/* Metadata information */}
            <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-2">Metadata Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Description URL:</span> {formData.metadata?.descriptionUrl || "None"}</div>
                <div><span className="font-medium">Marketing URL:</span> {formData.metadata?.marketingUrl || "None"}</div>
                {formData.metadata?.tokenContractAddress && (
                  <div><span className="font-medium">Token Contract Address:</span> {formData.metadata?.tokenContractAddress}</div>
                )}
                <div><span className="font-medium">Icon URL:</span> {formData.metadata?.iconUrl || "None"}</div>
                
                {/* Screenshot URLs */}
                <div className="mt-2">
                  <div className="font-medium">Screenshot URLs:</div>
                  <ol className="list-decimal list-inside mt-1 pl-2">
                    {formData.metadata?.screenshotUrls.map((url, index) => (
                      url ? (
                        <li key={index} className="text-xs truncate">
                          {url}
                        </li>
                      ) : null
                    ))}
                  </ol>
                </div>
              </div>
            </div>
            
            {/* Transaction information */}
            <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm">
              <p className="font-medium text-orange-600 dark:text-orange-400">
                You will need to sign two separate transactions:
              </p>
              <ol className="list-decimal list-inside mt-1 pl-2">
                <li className="mb-1">Registry contract: To register your app identity</li>
                <li>Metadata contract: To store your app's metadata</li>
              </ol>
            </div>
          </div>
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
                placeholder={`URL for app description (max ${MAX_URL_LENGTH} chars)`}
                required
                className={`min-h-[80px] ${errors['metadata.descriptionUrl'] ? "border-red-500" : ""}`}
              />
              {errors['metadata.descriptionUrl'] && (
                <p className="text-red-500 text-sm mt-1">{errors['metadata.descriptionUrl']}</p>
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
                placeholder={`URL for marketing materials (max ${MAX_URL_LENGTH} chars)`}
                required
                className={`min-h-[80px] ${errors['metadata.marketingUrl'] ? "border-red-500" : ""}`}
              />
              {errors['metadata.marketingUrl'] && (
                <p className="text-red-500 text-sm mt-1">{errors['metadata.marketingUrl']}</p>
              )}
            </div>

            {/* Token Contract Address */}
            <div className="grid gap-2">
              <Label htmlFor="tokenContractAddress">Token Contract Address</Label>
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
                placeholder="CAIP-2 compliant token contract address"
                required
                className={errors['metadata.tokenContractAddress'] ? "border-red-500" : ""}
              />
              {errors['metadata.tokenContractAddress'] && (
                <p className="text-red-500 text-sm mt-1">{errors['metadata.tokenContractAddress']}</p>
              )}
            </div>

            {/* Images section with border */}
            <div className="border p-4 rounded-md mt-2 bg-white dark:bg-slate-800">
              <p className="font-medium mb-2">App Images</p>

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
                  placeholder="URL to app icon (1024 x 1024 resolution)"
                  required
                  className={`min-h-[80px] ${errors['metadata.iconUrl'] ? "border-red-500" : ""}`}
                />
                {errors['metadata.iconUrl'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['metadata.iconUrl']}</p>
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
                          const newScreenshots = [...prev.metadata!.screenshotUrls];
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
                      placeholder={`URL to screenshot ${index + 1} (max 2048 x 2048 resolution)`}
                      required={index === 0}
                      className={`min-h-[80px] ${errors[`metadata.screenshotUrls.${index}`] ? "border-red-500" : ""}`}
                    />
                    {errors[`metadata.screenshotUrls.${index}`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`metadata.screenshotUrls.${index}`]}</p>
                    )}
                  </div>
                ))}
              </div>
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Register New App</DialogTitle>
            <DialogDescription>
              Step {currentStep} of 4: {stepTitles[currentStep]}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex justify-between mb-4 mt-2">
            {[1, 2, 3, 4].map((step) => (
              <div 
                key={step} 
                className={`w-1/4 h-1 mx-1 rounded-full ${
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
                 currentStep < 4 ? (
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