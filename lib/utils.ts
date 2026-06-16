import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, addHours, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import QRCode from "qrcode";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MP-${timestamp}-${random}`;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMMM yyyy", { locale: fr });
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy à HH:mm", { locale: fr });
}

export function calculateDeposit(
  totalPrice: number,
  depositPercentage: number,
  depositMinAmount: number
): number {
  const percentageAmount = (totalPrice * depositPercentage) / 100;
  return Math.max(percentageAmount, depositMinAmount);
}

export function calculateExpiryDate(bookingHours: number): Date {
  return addHours(new Date(), bookingHours);
}

export function isExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false;
  return isBefore(new Date(expiresAt), new Date());
}

export async function generateQRCode(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

// Map a birthday time slot "16:00-19:00" → the futsal hours it occupies → [16, 17, 18]
export function birthdayTimeToHours(time: string): number[] {
  const match = time?.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return [];
  const startH = parseInt(match[1]);
  const endH = parseInt(match[3]);
  const endM = parseInt(match[4]);
  const hours: number[] = [];
  for (let h = startH; h < endH + (endM > 0 ? 1 : 0); h++) hours.push(h);
  if (endM === 0 && hours[hours.length - 1] === endH) hours.pop();
  return hours;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    marmaille: "Marmaille Parc",
    marmaille_foot: "Marmaille + Foot",
    foot: "Foot",
  };
  return labels[category] ?? category;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    marmaille: "green",
    marmaille_foot: "purple",
    foot: "blue",
  };
  return colors[category] ?? "gray";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "En attente",
    deposit_pending: "Acompte en attente",
    confirmed: "Confirmée",
    cancelled: "Annulée",
    expired: "Expirée",
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "yellow",
    deposit_pending: "orange",
    confirmed: "green",
    cancelled: "red",
    expired: "gray",
  };
  return colors[status] ?? "gray";
}

export function getIncludesLabel(includes: string): string {
  const labels: Record<string, string> = {
    boisson: "🥤 Boisson",
    crepe: "🥞 Crêpe",
    dejeuner: "🍽️ Déjeuner",
  };
  return labels[includes] ?? includes;
}
