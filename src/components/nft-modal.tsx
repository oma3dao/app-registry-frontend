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

interface NFTModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (nft: NFT) => void
  nft: NFT | null
}

export default function NFTModal({ isOpen, onClose, onSave, nft }: NFTModalProps) {
  const [formData, setFormData] = useState<Omit<NFT, "id">>({
    name: "",
    version: "",
    did: "",
    dataUrl: "",
    iwpsPortalUri: "",
    agentPortalUri: "",
    contractAddress: "",
  })

  useEffect(() => {
    if (nft) {
      setFormData({
        name: nft.name,
        version: nft.version,
        did: nft.did,
        dataUrl: nft.dataUrl,
        iwpsPortalUri: nft.iwpsPortalUri,
        agentPortalUri: nft.agentPortalUri,
        contractAddress: nft.contractAddress || "",
      })
    } else {
      setFormData({
        name: "",
        version: "",
        did: "",
        dataUrl: "",
        iwpsPortalUri: "",
        agentPortalUri: "",
        contractAddress: "",
      })
    }
  }, [nft, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: nft?.id || "",
      ...formData,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={isOpen ? onClose : undefined}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{nft ? "Edit App Registration" : "Register New App"}</DialogTitle>
            <DialogDescription>
              {nft
                ? "Update the details of your application."
                : "Fill in the details to register your application."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">App Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Maximum of 32 characters"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                name="version"
                value={formData.version}
                onChange={handleChange}
                placeholder="Format: X.Y.Z (numbers only)"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="did">DID</Label>
              <Input
                id="did"
                name="did"
                value={formData.did}
                onChange={handleChange}
                placeholder="did:example:123456789abcdefghi"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dataUrl">Data URL</Label>
              <Input
                id="dataUrl"
                name="dataUrl"
                type="url"
                value={formData.dataUrl}
                onChange={handleChange}
                placeholder="See developer docs for details"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="iwpsPortalUri">IWPS Portal URI</Label>
              <Input
                id="iwpsPortalUri"
                name="iwpsPortalUri"
                type="url"
                value={formData.iwpsPortalUri}
                onChange={handleChange}
                placeholder="See developer docs"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="agentPortalUri">Agent Portal URI</Label>
              <Input
                id="agentPortalUri"
                name="agentPortalUri"
                type="url"
                value={formData.agentPortalUri}
                onChange={handleChange}
                placeholder="See developer docs"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contractAddress">Contract Address (Optional)</Label>
              <Input
                id="contractAddress"
                name="contractAddress"
                value={formData.contractAddress}
                onChange={handleChange}
                placeholder="CAIP-2 compliant smart contract address"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{nft ? "Save" : "Register"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

