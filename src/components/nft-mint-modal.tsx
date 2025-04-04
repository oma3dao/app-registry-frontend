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
} from "@/components/ui/dialog"
import type { NFT } from "@/types/nft"
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

interface NFTMintModalProps {
  isOpen: boolean
  handleCloseMintModal: () => void
  onSave: (nft: NFT) => Promise<void>
  nft: NFT | null
}

export default function NFTMintModal({ isOpen, handleCloseMintModal, onSave, nft }: NFTMintModalProps) {
  const [formData, setFormData] = useState<NFT>({
    did: "",
    name: "",
    version: "",
    dataUrl: "",
    iwpsPortalUri: "",
    agentPortalUri: "",
    contractAddress: "",
    status: 0, // Default to Active
    minter: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showTxAlert, setShowTxAlert] = useState(false)

  useEffect(() => {
    if (nft) {
      setFormData({
        did: nft.did,
        name: nft.name,
        version: nft.version,
        dataUrl: nft.dataUrl,
        iwpsPortalUri: nft.iwpsPortalUri,
        agentPortalUri: nft.agentPortalUri,
        contractAddress: nft.contractAddress || "",
        status: nft.status || 0,
        minter: nft.minter || ""
      })
      // Clear errors when opening with existing NFT
      setErrors({})
    } else {
      setFormData({
        did: "",
        name: "",
        version: "",
        dataUrl: "",
        iwpsPortalUri: "",
        agentPortalUri: "",
        contractAddress: "",
        status: 0, // Default to Active
        minter: ""
      })
      // Clear errors when opening empty form
      setErrors({})
    }
    // Reset state when modal opens
    setIsSaving(false)
    setShowTxAlert(false)
  }, [nft, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    
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
      case "agentPortalUri":
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all fields before submission
    const newErrors: Record<string, string> = {}
    
    // Required field validations
    if (!validateName(formData.name)) {
      newErrors.name = `Name must be between 1 and ${MAX_NAME_LENGTH} characters`
    }
    
    if (!validateVersion(formData.version)) {
      newErrors.version = "Version must be in format X.Y.Z or X.Y where X, Y, and Z are numbers"
    }
    
    if (!validateDid(formData.did)) {
      newErrors.did = `Valid DID required (max ${MAX_DID_LENGTH} characters, format: did:method:id)`
    }
    
    if (!validateUrl(formData.dataUrl)) {
      newErrors.dataUrl = `Valid URL required (max ${MAX_URL_LENGTH} characters)`
    }
    
    if (!validateUrl(formData.iwpsPortalUri)) {
      newErrors.iwpsPortalUri = `Valid URL required (max ${MAX_URL_LENGTH} characters)`
    }
    
    if (!validateUrl(formData.agentPortalUri)) {
      newErrors.agentPortalUri = `Valid URL required (max ${MAX_URL_LENGTH} characters)`
    }
    
    // Optional field validations
    if (formData.contractAddress && !validateCaipAddress(formData.contractAddress)) {
      newErrors.contractAddress = "Invalid contract address format"
    }
    
    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setIsSaving(true)
    setShowTxAlert(true)
    
    try {
      await onSave(formData)
    } catch (error) {
      console.error("Error registering app:", error)
      setShowTxAlert(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={isOpen ? handleCloseMintModal : undefined}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Register New App</DialogTitle>
            <DialogDescription>
              Fill in the details to register your application.
            </DialogDescription>
          </DialogHeader>

          {showTxAlert && (
            <TransactionAlert
              title="App Registration Transaction"
              description="Please approve the transaction in your wallet to register your app."
              isMobile={isMobile()}
            />
          )}

          <div className="grid gap-4 py-4">
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
                placeholder="Format: X.Y.Z or X.Y (numbers only)"
                required
                className={errors.version ? "border-red-500" : ""}
              />
              {errors.version && (
                <p className="text-red-500 text-sm mt-1">{errors.version}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="did">DID</Label>
              <Input
                id="did"
                name="did"
                value={formData.did}
                onChange={handleChange}
                placeholder={`did:method:id (max ${MAX_DID_LENGTH} chars)`}
                required
                className={errors.did ? "border-red-500" : ""}
              />
              {errors.did && (
                <p className="text-red-500 text-sm mt-1">{errors.did}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dataUrl">Data URL</Label>
              <Input
                id="dataUrl"
                name="dataUrl"
                type="url"
                value={formData.dataUrl}
                onChange={handleChange}
                placeholder={`Valid URL (max ${MAX_URL_LENGTH} chars)`}
                required
                className={errors.dataUrl ? "border-red-500" : ""}
              />
              {errors.dataUrl && (
                <p className="text-red-500 text-sm mt-1">{errors.dataUrl}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="iwpsPortalUri">IWPS Portal URI</Label>
              <Input
                id="iwpsPortalUri"
                name="iwpsPortalUri"
                type="url"
                value={formData.iwpsPortalUri}
                onChange={handleChange}
                placeholder={`Valid URL (max ${MAX_URL_LENGTH} chars)`}
                required
                className={errors.iwpsPortalUri ? "border-red-500" : ""}
              />
              {errors.iwpsPortalUri && (
                <p className="text-red-500 text-sm mt-1">{errors.iwpsPortalUri}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="agentPortalUri">Agent Portal URI</Label>
              <Input
                id="agentPortalUri"
                name="agentPortalUri"
                type="url"
                value={formData.agentPortalUri}
                onChange={handleChange}
                placeholder={`Valid URL (max ${MAX_URL_LENGTH} chars)`}
                required
                className={errors.agentPortalUri ? "border-red-500" : ""}
              />
              {errors.agentPortalUri && (
                <p className="text-red-500 text-sm mt-1">{errors.agentPortalUri}</p>
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseMintModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={Object.keys(errors).length > 0 || isSaving}>
              {isSaving ? "Registering..." : "Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 