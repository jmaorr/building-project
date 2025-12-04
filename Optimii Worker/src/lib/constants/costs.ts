// Cost-related constants
// Note: These are NOT in a "use server" file so they can be imported client-side

export const COST_CATEGORIES = [
  "Labor",
  "Materials",
  "Equipment",
  "Permits & Fees",
  "Professional Services",
  "Subcontractor",
  "Insurance",
  "Utilities",
  "Other",
] as const;

export type CostCategory = typeof COST_CATEGORIES[number];

export const PAYMENT_STATUSES = [
  "not_started",
  "quoted",
  "approved",
  "partially_paid",
  "paid",
] as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[number];

