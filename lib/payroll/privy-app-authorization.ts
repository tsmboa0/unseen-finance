/**
 * Authorization context for Privy Wallet API when using an app-registered key quorum
 * (session signer). Private key: PKCS#8 DER, base64, no PEM headers — see `@privy-io/node` docs.
 */
export function getPayrollAppWalletAuthorizationContext(): {
  authorization_private_keys: string[];
} {
  const key = process.env.PRIVY_APP_AUTHORIZATION_PRIVATE_KEY?.trim();
  if (!key) {
    throw new Error(
      "PRIVY_APP_AUTHORIZATION_PRIVATE_KEY is not set. Generate a keypair with `npm run privy:gen-payroll-auth-key` and register the public key in the Privy dashboard.",
    );
  }
  return { authorization_private_keys: [key] };
}
