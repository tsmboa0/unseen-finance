import { address } from "@solana/kit";

export type PayrollRecipientInput = {
  address: string;
  amount: string;
};

function isHeaderRow(a: string, b: string): boolean {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  return (
    la.includes("address") ||
    la.includes("wallet") ||
    la === "pubkey" ||
    lb === "amount"
  );
}

/** Parse CSV text: each row `wallet,amount` or `wallet, amount`. First row can be a header. */
export function parsePayrollCsv(text: string): { rows: PayrollRecipientInput[]; errors: string[] } {
  const errors: string[] = [];
  const rows: PayrollRecipientInput[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: need wallet and amount separated by comma`);
      continue;
    }
    const [wal, amt, ...rest] = parts;
    if (rest.length > 0) {
      errors.push(`Line ${i + 1}: too many columns (use: wallet,amount)`);
      continue;
    }
    if (i === 0 && isHeaderRow(wal, amt)) continue;
    rows.push({ address: wal, amount: amt });
  }

  return { rows, errors };
}

export function isValidSolanaAddress(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  try {
    address(t);
    return true;
  } catch {
    return false;
  }
}
