export interface Product {
  id: string;
  slug: string;
  name: string;
  websiteUrl?: string;
  sendingDomain?: string;
  active: boolean;
}

export interface BrandKit {
  id: string;
  productId: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    ctaBg: string;
    ctaText: string;
  };
  typography: {
    fontFamily: string;
    headingWeight: string;
    bodySize: string;
  };
  logoUrl?: string;
  logoDarkUrl?: string;
  footerHtml?: string;
  voice: {
    tone: string[];
    forbiddenWords: string[];
    readingLevel: string;
  };
  version: number;
}
