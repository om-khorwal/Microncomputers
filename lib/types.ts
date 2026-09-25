export type Specifications = Record<string, string>;

export type Product = {
  id: string;
  model_number: string;
  name: string;
  brand: string | null;
  category: string | null;
  quantity: number;
  price: number;
  image_url: string | null;
  specifications: Specifications | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

/** The static category taxonomy. Simple and fixed on purpose — no categories table. */
export const CATEGORIES = [
  "Business Laptops",
  "Gaming Laptops",
  "Ultrabooks",
  "2-in-1 Laptops",
  "Student Laptops",
  "Workstations",
] as const;
