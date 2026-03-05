import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidEmail(email: string) {
  if (!email) return false;
  // simple RFC 5322-lite regex for validation
  const re = /^(?:[a-zA-Z0-9_'’+\-]+(?:\.[a-zA-Z0-9_'’+\-]+)*)@(?:[a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}
