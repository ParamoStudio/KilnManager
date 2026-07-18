/**
 * Partner-payment status, per month + partner. Persisted alongside the firings
 * so the Expenses viewer and the exported workbooks agree on what's been paid.
 * Default is "pending" (absent key = not paid); a present value is the ISO date
 * (YYYY-MM-DD) it was marked paid.
 */
import { storage } from "./storage";

export const payments = $state<{ paid: Record<string, string> }>({ paid: {} });

export const payKey = (monthKey: string, partnerId: string): string => `${monthKey}::${partnerId}`;

export function isPaid(monthKey: string, partnerId: string): boolean {
  return !!payments.paid[payKey(monthKey, partnerId)];
}

/** ISO date (YYYY-MM-DD) the partner was marked paid, or null. */
export function paidAt(monthKey: string, partnerId: string): string | null {
  return payments.paid[payKey(monthKey, partnerId)] ?? null;
}

export function setPaid(monthKey: string, partnerId: string, value: boolean): void {
  const k = payKey(monthKey, partnerId);
  if (value) payments.paid[k] = new Date().toISOString().slice(0, 10);
  else delete payments.paid[k];
  void storage.write("Payments", $state.snapshot(payments).paid);
}

export async function loadPayments(): Promise<void> {
  const saved = await storage.read<Record<string, unknown>>("Payments");
  const out: Record<string, string> = {};
  if (saved && typeof saved === "object") {
    for (const [k, v] of Object.entries(saved)) {
      // Tolerate the legacy boolean shape (paid but date unknown).
      if (typeof v === "string") out[k] = v;
      else if (v === true) out[k] = "";
    }
  }
  payments.paid = out;
}
