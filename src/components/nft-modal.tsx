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
    description: "",
    appUrl: "",
    imageUrl: "",
  })

  useEffect(() => {
    if (nft) {
      setFormData({
        name: nft.name,
        description: nft.description,
        appUrl: nft.appUrl,
        imageUrl: nft.imageUrl,
      })
    } else {
      setFormData({
        name: "",
        description: "",
        appUrl: "",
        imageUrl: "",
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
            <DialogTitle>{nft ? "Edit App NFT" : "Mint New App NFT"}</DialogTitle>
            <DialogDescription>
              {nft
                ? "Update the details of your registered application."
                : "Fill in the details to mint a new NFT for your application."}
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
                placeholder="My Awesome App"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your application..."
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="appUrl">App URL</Label>
              <Input
                id="appUrl"
                name="appUrl"
                type="url"
                value={formData.appUrl}
                onChange={handleChange}
                placeholder="https://myapp.example.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://example.com/image.png"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{nft ? "Save" : "Mint"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

