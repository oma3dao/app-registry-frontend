"use client";

import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { InterfaceFlags } from '@/types/form';

interface InterfacesSelectorProps {
  value: InterfaceFlags;
  onChange: (value: InterfaceFlags) => void;
  className?: string;
}

/**
 * Interfaces selector component for Step 0
 * Currently only Human is enabled; API and Smart Contract are visible but disabled
 */
export function InterfacesSelector({ value, onChange, className = "" }: InterfacesSelectorProps) {
  const handleChange = (key: keyof InterfaceFlags) => (checked: boolean | "indeterminate") => {
    if (typeof checked !== "boolean") return;
    
    // Only allow changing Human for now
    if (key !== "human") return;
    
    onChange({ ...value, [key]: checked });
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}>
      {/* Human - Enabled */}
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox 
          checked={value.human} 
          onCheckedChange={handleChange("human")} 
        />
        <span className="text-sm font-medium">Human</span>
      </label>

      {/* API - Disabled (Coming Soon) */}
      <label className="flex items-center gap-2 opacity-60 cursor-not-allowed">
        <Checkbox 
          checked={value.api} 
          disabled 
          onCheckedChange={handleChange("api")} 
        />
        <span className="text-sm font-medium">
          API <span className="text-xs ml-1 text-muted-foreground">(soon)</span>
        </span>
      </label>

      {/* Smart Contract - Disabled (Coming Soon) */}
      <label className="flex items-center gap-2 opacity-60 cursor-not-allowed">
        <Checkbox 
          checked={value.smartContract} 
          disabled 
          onCheckedChange={handleChange("smartContract")} 
        />
        <span className="text-sm font-medium">
          Smart Contract <span className="text-xs ml-1 text-muted-foreground">(soon)</span>
        </span>
      </label>
    </div>
  );
}
