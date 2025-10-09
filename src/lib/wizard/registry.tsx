/**
 * Wizard step registry - the single source of truth for all wizard steps
 * 
 * Each step is defined here with:
 * - Visibility rules (which interfaces it applies to)
 * - Fields it owns
 * - Validation schema
 * - Guard conditions
 * - Render component
 * 
 * To add a new step: define a StepDef object and add it to ALL_STEPS.
 * To change step fields: update the step's `fields` array and `schema`.
 * To change step order: reorder ALL_STEPS.
 */

import { z } from "zod";
import type { StepDef, InterfaceFlags, RegistryMeta } from "./types";

// Import step components (will be created/migrated in Phase 2)
// For now, these are placeholders that wrap existing components
import Step1VerificationComponent from "@/components/wizard-steps/step-1-verification";
import Step2OnchainComponent from "@/components/wizard-steps/step-2-onchain";
import Step3CommonComponent from "@/components/wizard-steps/step-3-common";
import { isFieldRequired } from "./field-requirements";
import Step4HumanMediaComponent from "@/components/wizard-steps/step-4-human-media";
import Step5HumanDistributionComponent from "@/components/wizard-steps/step-5-human-distribution";
import Step6ReviewComponent from "@/components/wizard-steps/step-6-review";

// ============================================================================
// Validation Schemas
// ============================================================================

const SemverSchema = z.string().regex(/^\d+\.\d+(\.\d+)?$/, "Version must be x.y or x.y.z");
const DidSchema = z.string()
  .min(1, "DID is required")
  .regex(/^did:(web|pkh):.+$/, "Only did:web and did:pkh are supported");
const UrlSchema = z.string().url("Must be a valid URL");
const OptionalUrlSchema = z.union([z.string().url(), z.literal("")]).optional();

// ============================================================================
// Step Definitions
// ============================================================================

/**
 * Step 1: Verification
 * Always visible. Collects DID, version, interface flags, and triggers verification.
 */
export const Step1_Verification: StepDef = {
  id: "verification",
  title: "Verification",
  description: "Verify DID ownership and configure app interfaces",
  
  fields: ["did", "version", "name", "interfaceFlags"],
  
  schema: z.object({
    did: DidSchema,
    version: SemverSchema,
    name: z.string().min(2, "Name must be at least 2 characters").max(80),
    interfaceFlags: z.object({
      human: z.boolean(),
      api: z.boolean(),
      smartContract: z.boolean(),
    }),
  }),

  guard: (state) => {
    // Check if verification status is ready (set by verification component)
    const verificationReady = state._verificationStatus === "ready";

    // Enforce verification for both did:web and did:pkh (ownership check required for both)
    const did = (state.did || "").trim();
    const requiresVerification = did.startsWith("did:web:") || did.startsWith("did:pkh:");
    if (requiresVerification && !verificationReady) {
      return { ok: false, reason: "Complete DID verification before proceeding" };
    }

    return { ok: true };
  },

  render: (ctx) => <Step1VerificationComponent {...ctx} />,
};

/**
 * Step 2: Onchain Data
 * Always visible. Core on-chain fields: dataUrl, contractId, fungibleTokenId, traits.
 */
export const Step2_Onchain: StepDef = {
  id: "onchain",
  title: "Onchain Data",
  description: "Configure on-chain identifiers and data references",
  
  fields: ["dataUrl", "contractId", "fungibleTokenId", "traits"],
  
  schema: z.object({
    dataUrl: UrlSchema,
    contractId: z.string().optional(),
    fungibleTokenId: z.string().optional(),
    traits: z.array(z.string().min(1, "Trait cannot be empty")).optional(),
  }),

  render: (ctx) => <Step2OnchainComponent {...ctx} />,
};

/**
 * Step 3: Common Offchain
 * Always visible. Common metadata: description, external URL, image.
 */
export const Step3_Common: StepDef = {
  id: "common",
  title: "Common Info",
  description: "Basic app information for all interfaces",
  
  fields: [
    "metadata.description",
    "metadata.external_url",
    "metadata.image",
    "metadata.summary",
    "metadata.publisher",
    "metadata.legalUrl",
    "metadata.supportUrl",
  ],
  
  // Dynamic schema: requiredness of some fields depends on interface flags
  schema: z.any().superRefine((state, ctx) => {
    const md = state?.metadata || {};
    const flags = state?.interfaceFlags;

    const must = (path: string) => isFieldRequired(path, flags);
    const ensureText = (value: any, path: string, label: string) => {
      if (must(path)) {
        if (typeof value !== "string" || value.trim().length === 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata", path.split(".")[1]], message: `${label} is required` });
        }
      }
    };
    const ensureUrl = (value: any, path: string, label: string) => {
      if (must(path)) {
        if (typeof value !== "string" || value.length === 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata", path.split(".")[1]], message: `${label} is required` });
          return;
        }
        try {
          new URL(value);
        } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata", path.split(".")[1]], message: `${label} must be a valid URL` });
        }
      } else if (typeof value === "string" && value.length > 0) {
        try { new URL(value); } catch { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata", path.split(".")[1]], message: `${label} must be a valid URL` }); }
      }
    };

    // Requiredness per FIELD_REQUIREMENTS (updated by user changes)
    ensureText(md.description, "metadata.description", "Description");
    ensureText(md.publisher, "metadata.publisher", "Publisher");
    ensureUrl(md.external_url, "metadata.external_url", "Marketing URL");
    ensureUrl(md.image, "metadata.image", "Icon URL");

    // Optionals unless required in future rules
    if (typeof md.summary !== "undefined" && typeof md.summary !== "string") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata", "summary"], message: "Summary must be a string" });
    }
    if (typeof md.publisher !== "undefined" && typeof md.publisher !== "string") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata", "publisher"], message: "Publisher must be a string" });
    }
    ensureUrl(md.legalUrl, "metadata.legalUrl", "Legal URL");
    ensureUrl(md.supportUrl, "metadata.supportUrl", "Support URL");
  }),

  render: (ctx) => <Step3CommonComponent {...ctx} />,
};

/**
 * Step 4: Human Media
 * Conditional: only for human-facing apps (human === true)
 */
export const Step4_HumanMedia: StepDef = {
  id: "human-media",
  title: "Media & Assets",
  description: "Screenshots and visual assets for human users",
  
  appliesTo: (flags: InterfaceFlags) => flags.human,
  
  fields: ["metadata.screenshotUrls"],
  
  schema: z.any().superRefine((state, ctx) => {
    const flags = state?.interfaceFlags;
    const mustScreens = isFieldRequired("metadata.screenshotUrls", flags);
    const urls: any[] = state?.metadata?.screenshotUrls || [];
    const nonEmpty = urls.filter((u) => typeof u === "string" && u.length > 0);
    if (mustScreens && nonEmpty.length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata","screenshotUrls"], message: "At least one screenshot is required" });
    }
    // Validate format for any provided URLs
    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      if (typeof u === "string" && u.length > 0) {
        try { new URL(u); } catch { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata","screenshotUrls", i], message: "Must be a valid URL" }); }
      }
    }
  }),

  render: (ctx) => <Step4HumanMediaComponent {...ctx} />,
};

/**
 * Step 5: Human Distribution
 * Conditional: only for human-facing apps (human === true)
 * Optional fields: IWPS portal URL, platform availability
 */
export const Step5_HumanDistribution: StepDef = {
  id: "human-distribution",
  title: "Distribution",
  description: "Platform availability and distribution settings",
  
  appliesTo: (flags: InterfaceFlags) => flags.human,
  
  fields: ["iwpsPortalUrl", "metadata.platforms"],
  
  schema: z.any().superRefine((state, ctx) => {
    const iwps = state?.iwpsPortalUrl;
    if (typeof iwps === "string" && iwps.length > 0) {
      try { new URL(iwps); } catch { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["iwpsPortalUrl"], message: "IWPS Portal URL must be a valid URL" }); }
    }

    // platforms: at least one URL (download or launch) somewhere if human
    const flags = state?.interfaceFlags;
    const platforms = state?.metadata?.platforms || {};
    const hasAnyUrl = Object.values(platforms).some((det: any) => {
      const d = det?.downloadUrl; const l = det?.launchUrl;
      return (typeof d === "string" && d.length > 0) || (typeof l === "string" && l.length > 0);
    });
    if (flags?.human && !hasAnyUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata","platforms"], message: "Provide at least one Download or Launch URL for a platform" });
    }

    // Validate any provided URLs
    for (const [platformKey, details] of Object.entries(platforms)) {
      const platformDetails = details as import('@/types/metadata-contract').PlatformDetails | undefined;
      const d = platformDetails?.downloadUrl;
      const l = platformDetails?.launchUrl;
      if (typeof d === "string" && d.length > 0) {
        try { new URL(d); } catch { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata","platforms", platformKey, "downloadUrl"], message: "Must be a valid URL" }); }
      }
      if (typeof l === "string" && l.length > 0) {
        try { new URL(l); } catch { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata","platforms", platformKey, "launchUrl"], message: "Must be a valid URL" }); }
      }
    }
  }),

  render: (ctx) => <Step5HumanDistributionComponent {...ctx} />,
};

/**
 * Step 6: Review
 * Always visible. Final review before minting.
 */
export const Step6_Review: StepDef = {
  id: "review",
  title: "Review",
  description: "Review all information before minting",
  
  fields: [], // No fields, read-only review
  
  // Note: Review step validates the ENTIRE form using composeSchemas()
  // No per-step schema needed

  render: (ctx) => <Step6ReviewComponent {...ctx} />,
};

/**
 * Step 7: Mint
 * Always visible. Execute the mint transaction.
 */
// Step 7 (Mint) removed – review step now leads directly to submit

// ============================================================================
// Registry Export
// ============================================================================

/**
 * All steps in order
 * This array determines step order in the wizard.
 */
export const ALL_STEPS: StepDef[] = [
  Step1_Verification,
  Step2_Onchain,
  Step3_Common,
  Step4_HumanMedia,
  Step5_HumanDistribution,
  Step6_Review,
];

/**
 * Registry metadata
 * Increment version when making breaking changes to step schemas or IDs
 */
export const REGISTRY_META: RegistryMeta = {
  version: 1,
  lastModified: new Date().toISOString(),
};

// ============================================================================
// Development-only validation
// ============================================================================

if (process.env.NODE_ENV === "development") {
  const { assertValidRegistry } = require("./linter");
  assertValidRegistry(ALL_STEPS, REGISTRY_META);
}
