/** Community invite link for beta testers (override via env). */
export function betaTelegramInviteUrl(): string {
  const u = process.env.NEXT_PUBLIC_BETA_TELEGRAM_URL?.trim();
  return u && u.startsWith("http") ? u : "https://t.me/unseenfinance";
}
