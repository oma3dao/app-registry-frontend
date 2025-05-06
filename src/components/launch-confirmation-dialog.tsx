"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLinkIcon, DownloadIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

interface LaunchConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  destinationUrl?: string | null;
  downloadUrl?: string | null;
  location?: string | null;
  teleportPin?: string | null;
}

export default function LaunchConfirmationDialog({
  isOpen,
  onClose,
  appName,
  destinationUrl,
  downloadUrl,
  location,
  teleportPin,
}: LaunchConfirmationDialogProps) {

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{appName}</DialogTitle>
          <DialogDescription>
            Review the details below to proceed with launching or accessing the application.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {teleportPin && (
            <div className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-md">
              <p className="text-sm text-muted-foreground mb-2">
                For additional security, make sure this PIN is displayed on the application when it opens:
              </p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold tracking-wider">{teleportPin}</p>
              </div>
              {location && (
                <p className="text-xs text-muted-foreground mt-2">
                  Location hint: {location}
                </p>
              )}
            </div>
          )}

          {destinationUrl && (
            <div className="space-y-1 mt-2">
              <h4 className="text-sm font-medium">Launch URL:</h4>
              <p className="text-sm text-blue-600 dark:text-blue-400 break-all">{destinationUrl}</p>
            </div>
          )}

          {downloadUrl && (
            <div className="space-y-1 mt-2">
              <h4 className="text-sm font-medium">Download URL:</h4>
              <p className="text-sm text-blue-600 dark:text-blue-400 break-all">{downloadUrl}</p>
            </div>
          )}

          {(!destinationUrl && !downloadUrl && !teleportPin) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No specific launch, download, or teleport information available.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          {downloadUrl && (
            <Button 
              onClick={() => window.open(downloadUrl, '_blank')}
            >
              <DownloadIcon className="mr-2 h-4 w-4" /> Download
            </Button>
          )}
          {destinationUrl && (
            <Button 
              onClick={() => {
                window.open(destinationUrl, '_blank');
                onClose();
              }}
              className={downloadUrl ? "" : "bg-green-600 hover:bg-green-700"}
            >
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              {teleportPin ? "Confirm Launch" : "Proceed to Launch"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 