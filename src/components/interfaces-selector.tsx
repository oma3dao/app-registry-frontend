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
 * All interfaces (Human, API, Smart Contract) are now enabled
 */
export function InterfacesSelector({ value, onChange, className = "" }: InterfacesSelectorProps) {
  const handleChange = (key: keyof InterfaceFlags) => (checked: boolean | "indeterminate") => {
    if (typeof checked !== "boolean") return;
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

      {/* API - Now Enabled */}
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox 
          checked={value.api} 
          onCheckedChange={handleChange("api")} 
        />
        <span className="text-sm font-medium">API</span>
      </label>

      {/* Smart Contract - Now Enabled */}
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox 
          checked={value.smartContract} 
          onCheckedChange={handleChange("smartContract")} 
        />
        <span className="text-sm font-medium">Smart Contract</span>
      </label>
    </div>
  );
}
