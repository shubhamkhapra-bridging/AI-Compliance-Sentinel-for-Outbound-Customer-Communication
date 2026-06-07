export const BRIDGINGTECH_PRODUCTS = [
  { slug: "denefits", name: "Denefits", regulations: ["PCI-DSS", "CAN-SPAM"] },
  { slug: "practina", name: "Practina", regulations: ["CAN-SPAM"] },
  { slug: "lendee", name: "Lendee", regulations: ["PCI-DSS", "CAN-SPAM"] },
  { slug: "coolcredit", name: "CoolCredit", regulations: ["PCI-DSS", "CAN-SPAM"] },
  { slug: "credee", name: "Credee", regulations: ["PCI-DSS", "CAN-SPAM"] },
  { slug: "financemutual", name: "FinanceMutual", regulations: ["HIPAA", "CAN-SPAM"] },
  { slug: "recuvery", name: "Recuvery", regulations: ["FDCPA", "CAN-SPAM"] },
] as const;

export type ProductSlug = (typeof BRIDGINGTECH_PRODUCTS)[number]["slug"];
