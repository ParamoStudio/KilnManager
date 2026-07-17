/**
 * Partner-payment status, per month + partner. Persisted alongside the firings
 * so the Expenses viewer and the exported workbook agree on what's been paid.
 * Default is "pending" (absent key = not paid).
 */
import { storage } from "./storage";

export const payments = $state<{ paid: Record<string, boolean> }>({ paid: {} });

export const payKey = (monthKey: string, partnerId: string): string => `${monthKey}::${partnerId}`;

export function isPaid(monthKey: string, partnerId: string): boolean {
  return !!payments.paid[payKey(monthKey, partnerId)];
}

export function setPaid(monthKey: string, partnerId: string, value: boolean): void {
  const k = payKey(monthKey, partnerId);
  if (value) payments.paid[k] = true;
  else delete payments.paid[k];
  void storage.write("Payments", $state.snapshot(payments).paid);
}

export async function loadPayments(): Promise<void> {
  const saved = await storage.read<Record<string, boolean>>("Payments");
  payments.paid = saved && typeof saved === "object" ? saved : {};
}
