"use client";

import React, { useEffect, useRef } from "react";
import type { StepRenderContext } from "@/lib/wizard";
import { isFieldRequired } from "@/lib/wizard/field-requirements";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UrlValidator } from "@/components/url-validator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";

type PlatformKey = "web" | "ios" | "android" | "windows" | "macos" | "meta" | "playstation" | "xbox" | "nintendo";

const PLATFORMS: PlatformKey[] = ["web","ios","android","windows","macos","meta","playstation","xbox","nintendo"];

export default function Step5_HumanDistribution(ctx: StepRenderContext) {
  const { state, updateField, errors } = ctx;
  const req = (path: string) => isFieldRequired(path, state.interfaceFlags);
  const platformsErr = errors?.["metadata.platforms"]; 

  const getPlatform = (key: PlatformKey) => state.metadata?.platforms?.[key] || {};
  const setPlatform = (key: PlatformKey, field: string, value: any) => {
    const current = state.metadata?.platforms || {};
    const next = { ...current, [key]: { ...(current[key] || {}), [field]: value } };
    updateField("metadata.platforms", next);
  };
  
  // Get/set artifact metadata (stored separately from platforms)
  const getArtifact = (artifactDid: string) => state.metadata?.artifacts?.[artifactDid] || {};
  const setArtifact = (artifactDid: string, field: string, value: any) => {
    if (!artifactDid) return;
    const current = state.metadata?.artifacts || {};
    const next = { ...current, [artifactDid]: { ...(current[artifactDid] || {}), [field]: value } };
    updateField("metadata.artifacts", next);
  };
  
  // Debounced artifact creation
  const artifactTimers = useRef<Record<string, NodeJS.Timeout>>({});
  
  const createArtifactDebounced = (artifactDid: string, platform: PlatformKey) => {
    if (!artifactDid) return;
    
    // Clear existing timer for this platform
    if (artifactTimers.current[platform]) {
      clearTimeout(artifactTimers.current[platform]);
    }
    
    // Set new timer - create artifact after 1 second of no changes
    artifactTimers.current[platform] = setTimeout(() => {
      if (!getArtifact(artifactDid).type) {
        const defaults = getArtifactDefaults(platform);
        setArtifact(artifactDid, "type", defaults.type);
        if (defaults.os) setArtifact(artifactDid, "os", defaults.os);
      }
    }, 1000);
  };
  
  // Cleanup orphaned artifacts (not referenced by any platform)
  useEffect(() => {
    const platforms = state.metadata?.platforms || {};
    const artifacts = state.metadata?.artifacts || {};
    
    // Collect all artifact DIDs referenced by platforms
    const referencedDids = new Set<string>();
    Object.values(platforms).forEach((platform: any) => {
      if (platform.artifactDid) {
        referencedDids.add(platform.artifactDid);
      }
    });
    
    // Remove artifacts that aren't referenced
    const artifactKeys = Object.keys(artifacts);
    const orphaned = artifactKeys.filter(did => !referencedDids.has(did));
    
    if (orphaned.length > 0) {
      const cleaned = { ...artifacts };
      orphaned.forEach(did => delete cleaned[did]);
      updateField("metadata.artifacts", Object.keys(cleaned).length > 0 ? cleaned : undefined);
    }
  }, [state.metadata?.platforms]); // Run when platforms change
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(artifactTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);
  
  // Helper to check if platform has downloadUrl (triggers artifact fields)
  const hasDownloadUrl = (key: PlatformKey) => {
    return !!(getPlatform(key).downloadUrl?.trim());
  };
  
  // Infer artifact metadata from platform
  const getArtifactDefaults = (platform: PlatformKey) => {
    switch (platform) {
      case 'web':
        return { type: 'website', os: null, showArch: false };
      case 'windows':
        return { type: 'binary', os: 'windows', showArch: true };
      case 'macos':
        return { type: 'binary', os: 'macos', showArch: true };
      case 'ios':
        return { type: 'binary', os: 'macos', showArch: true }; // iOS uses macOS ecosystem
      case 'android':
        return { type: 'binary', os: 'linux', showArch: true }; // Android is Linux-based
      case 'playstation':
      case 'xbox':
      case 'nintendo':
      case 'meta':
        return { type: 'binary', os: 'linux', showArch: true }; // Console OSes
      default:
        return { type: 'binary', os: null, showArch: true };
    }
  };

  return (
    <div className="space-y-6">
      {platformsErr && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md" role="alert" aria-live="polite">
          <p className="text-sm text-red-700 dark:text-red-400">{platformsErr}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="iwpsPortalUrl" className="text-base font-semibold">IWPS Portal URL {req("iwpsPortalUrl") ? "*" : ""}</Label>
        <Input
          id="iwpsPortalUrl"
          type="url"
          placeholder="https://iwps.example.com/app/xyz"
          value={state.iwpsPortalUrl || ""}
          onChange={(e) => updateField("iwpsPortalUrl", e.target.value)}
          className={errors?.iwpsPortalUrl ? "border-red-500" : ""}
        />
        <UrlValidator url={state.iwpsPortalUrl || ""} />
        {errors?.iwpsPortalUrl && <p className="text-sm text-red-500">{errors.iwpsPortalUrl}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold">Platforms (at least one URL required)</Label>
        <p className="text-sm text-muted-foreground">Provide Download or Launch URL where applicable. Add supported features optionally.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PLATFORMS.map((p) => {
            const details = getPlatform(p);
            return (
              <div key={p} className="p-3 rounded-md border">
                <div className="text-sm font-medium mb-2 capitalize">{p}</div>
                <div className="space-y-1">
                  <Input
                    type="url"
                    name={`metadata.platforms.${p}.downloadUrl`}
                    placeholder="Download URL"
                    value={details.downloadUrl || ""}
                    onChange={(e) => setPlatform(p, "downloadUrl", e.target.value)}
                  />
                  <UrlValidator url={details.downloadUrl || ""} />
                </div>
                
                {/* Artifact Fields - Show right after downloadUrl when provided */}
                {hasDownloadUrl(p) && (() => {
                  const defaults = getArtifactDefaults(p);
                  const artifactDid = details.artifactDid || "";
                  const artifact = artifactDid ? getArtifact(artifactDid) : {};
                  
                  return (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded space-y-2">
                      <div className="flex items-center gap-1">
                        <Info size={12} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Binary Verification (Optional)</span>
                      </div>
                      
                      <Input
                        type="text"
                        name={`metadata.platforms.${p}.artifactDid`}
                        placeholder="Artifact DID: did:artifact:bafybeig..."
                        value={artifactDid}
                        onChange={(e) => {
                          const oldDid = artifactDid;
                          const newDid = e.target.value;
                          
                          setPlatform(p, "artifactDid", newDid);
                          
                          // If DID changed and old one exists, remove old artifact
                          if (oldDid && oldDid !== newDid && state.metadata?.artifacts?.[oldDid]) {
                            const artifacts = { ...(state.metadata.artifacts || {}) };
                            delete artifacts[oldDid];
                            updateField("metadata.artifacts", Object.keys(artifacts).length > 0 ? artifacts : undefined);
                          }
                          
                          // Debounce artifact creation for new DID
                          if (newDid) {
                            createArtifactDebounced(newDid, p);
                          }
                        }}
                        className="text-xs"
                      />
                      
                      {defaults.showArch && artifactDid && (
                        <Select
                          value={artifact.architecture || ""}
                          onValueChange={(value) => {
                            // Initialize artifact with defaults when user selects architecture
                            if (!artifact.type) {
                              setArtifact(artifactDid, "type", defaults.type);
                              if (defaults.os) setArtifact(artifactDid, "os", defaults.os);
                            }
                            setArtifact(artifactDid, "architecture", value);
                          }}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Architecture (x64 or ARM64)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="x64">x64 (Intel/AMD)</SelectItem>
                            <SelectItem value="arm64">ARM64 (Apple Silicon, ARM)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Type: <strong>{defaults.type}</strong> | OS: <strong>{defaults.os || 'auto-detected'}</strong> • {' '}
                        <a 
                          href="https://github.com/oma3dao/omatrust-docs/blob/main/specification/omatrust-specification.md#artifacts" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Learn more →
                        </a>
                      </p>
                    </div>
                  );
                })()}
                
                <div className="space-y-1 mt-2">
                  <Input
                    type="url"
                    name={`metadata.platforms.${p}.launchUrl`}
                    placeholder="Launch URL"
                    value={details.launchUrl || ""}
                    onChange={(e) => setPlatform(p, "launchUrl", e.target.value)}
                  />
                  <UrlValidator url={details.launchUrl || ""} />
                </div>
                <div className="space-y-1 mt-2">
                  <Input
                    type="text"
                    name={`metadata.platforms.${p}.supported`}
                    placeholder="Supported features (comma-separated)"
                    value={(details.supported || []).join(", ")}
                    onChange={(e) => setPlatform(p, "supported", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
