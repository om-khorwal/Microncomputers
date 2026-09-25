import type { Product } from "@/lib/types";

/** Set in .env.local — no default, so a missing number is obvious instead of silently wrong. */
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export function whatsappConfigured(): boolean {
  return Boolean(WHATSAPP_NUMBER);
}

export function whatsappEnquiryLink(product: Pick<Product, "name" | "model_number">): string | null {
  if (!WHATSAPP_NUMBER) return null;
  const message = `Hi, I'm interested in the ${product.name} (Model: ${product.model_number}). Is it available?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function whatsappGeneralLink(): string | null {
  if (!WHATSAPP_NUMBER) return null;
  const message = "Hi, I'd like to know more about your current laptop stock.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
