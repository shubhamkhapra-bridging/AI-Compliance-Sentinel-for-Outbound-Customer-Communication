/**
 * Per-product branding defaults — the single source of truth for product
 * colors, website, legal/mailing address and tone.
 *
 * Used by:
 *   • prisma/seed.ts          → seeds a BrandKit per product
 *   • routes/conversations.ts → supplies brand + a CAN-SPAM physical address
 *                               to every generated draft
 *
 * Website auto-extraction (the Python WebKnowledgeAgent) may override `colors`
 * and `logoUrl` at generation time; these values are the reliable fallback.
 *
 * ⚠️  ADDRESSES BELOW ARE PLACEHOLDERS. Replace each with the product's real
 *     registered mailing address — CAN-SPAM requires a valid physical address.
 */

export interface BrandColors {
  primary: string;
  accent: string;
  button: string;
}

export interface BrandDefault {
  colors: BrandColors;
  logoUrl: string;
  websiteUrl: string;
  /** Physical mailing address rendered in the footer (CAN-SPAM). */
  address: string;
  voice: { tone: string; style: string };
}

const CORPORATE_ADDRESS = "BridgingTech Inc., 18200 Von Karman Ave, Suite 600, Irvine, CA 92612, USA";

export const brandDefaults: Record<string, BrandDefault> = {
  denefits: {
    colors: { primary: "#16A34A", accent: "#15803D", button: "#16A34A" },
    logoUrl: "",
    websiteUrl: "https://denefits.com",
    address: CORPORATE_ADDRESS,
    voice: { tone: "reassuring", style: "clear, supportive, finance-friendly" },
  },
  practina: {
    colors: { primary: "#7C3AED", accent: "#6D28D9", button: "#7C3AED" },
    logoUrl: "",
    websiteUrl: "https://www.practina.com",
    address: CORPORATE_ADDRESS,
    voice: { tone: "energetic", style: "modern, marketing-savvy" },
  },
  lendee: {
    colors: { primary: "#0D9488", accent: "#0F766E", button: "#0D9488" },
    logoUrl: "",
    websiteUrl: "https://lendee.com",
    address: CORPORATE_ADDRESS,
    voice: { tone: "trustworthy", style: "straightforward, transparent" },
  },
  coolcredit: {
    colors: { primary: "#0891B2", accent: "#0E7490", button: "#0891B2" },
    logoUrl: "",
    websiteUrl: "https://coolcredit.com",
    address: CORPORATE_ADDRESS,
    voice: { tone: "approachable", style: "friendly, encouraging" },
  },
  credee: {
    colors: { primary: "#4F46E5", accent: "#4338CA", button: "#4F46E5" },
    logoUrl: "",
    websiteUrl: "https://credee.com",
    address: CORPORATE_ADDRESS,
    voice: { tone: "professional", style: "concise, business-grade" },
  },
  financemutual: {
    colors: { primary: "#1D4ED8", accent: "#1E40AF", button: "#1D4ED8" },
    logoUrl: "",
    websiteUrl: "https://financemutual.com",
    address: CORPORATE_ADDRESS,
    voice: { tone: "authoritative", style: "formal, compliance-first" },
  },
  recuvery: {
    colors: { primary: "#EA580C", accent: "#C2410C", button: "#EA580C" },
    logoUrl: "",
    websiteUrl: "https://recuvery.com",
    address: CORPORATE_ADDRESS,
    voice: { tone: "firm but respectful", style: "FDCPA-compliant, non-threatening" },
  },
};

export const defaultBrand: BrandDefault = {
  colors: { primary: "#2563EB", accent: "#2563EB", button: "#2563EB" },
  logoUrl: "",
  websiteUrl: "",
  address: CORPORATE_ADDRESS,
  voice: { tone: "professional", style: "clear and concise" },
};

export function getBrandDefault(slug: string | undefined | null): BrandDefault {
  return (slug && brandDefaults[slug]) || defaultBrand;
}
