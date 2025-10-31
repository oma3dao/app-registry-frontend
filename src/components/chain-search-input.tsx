"use client"

import React, { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { searchChains, type ChainInfo } from "@/lib/utils/caip10/all-chains"

interface ChainSearchInputProps {
  value: number | null; // chainId
  onChange: (chainId: number, chainName: string) => void;
  placeholder?: string;
  className?: string;
}

export function ChainSearchInput({
  value,
  onChange,
  placeholder = "Search mainnets by name or ID...",
  className = "",
}: ChainSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainInfo | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const results = searchChains(searchQuery); // Always mainnets only

  // Update selected chain when value prop changes
  useEffect(() => {
    if (value !== null) {
      const chain = results.find(c => c.chainId === value);
      if (chain) {
        setSelectedChain(chain);
        setSearchQuery(""); // Clear search when selected
      }
    } else {
      setSelectedChain(null);
    }
  }, [value, results]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (chain: ChainInfo) => {
    setSelectedChain(chain);
    setSearchQuery("");
    setIsOpen(false);
    onChange(chain.chainId, chain.name);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const displayValue = selectedChain 
    ? `${selectedChain.name} (${selectedChain.chainId})`
    : searchQuery;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-8"
        />
        <ChevronDownIcon 
          className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              No chains found
            </div>
          ) : (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                {results.length} {results.length === 1 ? 'chain' : 'chains'}
              </div>
              {results.map((chain, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = selectedChain?.chainId === chain.chainId;
                
                return (
                  <button
                    key={chain.chainId}
                    type="button"
                    onClick={() => handleSelect(chain)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted/50 ${
                      isHighlighted ? "bg-muted" : ""
                    }`}
                  >
                    <span>
                      {chain.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({chain.chainId})
                      </span>
                    </span>
                    {isSelected && <CheckIcon className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

