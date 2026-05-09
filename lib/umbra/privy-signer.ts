import { createSignerFromWalletAccount } from "@umbra-privacy/sdk";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import {
  SolanaSignAndSendTransaction,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import type {
  SolanaSignAndSendTransactionInput,
  SolanaSignTransactionInput,
  WalletWithSolanaFeatures,
} from "@solana/wallet-standard-features";

import type { PrivySolanaWalletStandardChain } from "@/lib/solana-endpoints";

/** Wallet Standard types Solana features as a union of single-key objects; widen for safe patching. */
type MutableSolanaFeatureBundle = Record<
  string,
  {
    signTransaction?: (
      ...inputs: readonly SolanaSignTransactionInput[]
    ) => Promise<readonly { signedTransaction: Uint8Array }[]>;
    signAndSendTransaction?: (
      ...inputs: readonly SolanaSignAndSendTransactionInput[]
    ) => Promise<readonly { signature: Uint8Array }[]>;
    version?: string;
    supportedTransactionVersions?: readonly string[];
  }
>;

/**
 * Privy's Wallet Standard bridge often omits `chain` on `signTransaction` inputs, which makes the
 * embedded-wallet UI default to mainnet RPC (and public mainnet endpoints frequently return 403).
 * Umbra uses devnet RPC for dev merchants — inject the cluster so fee simulation matches Umbra.
 */
function injectDefaultSolanaChainOnWalletStandardWallet(
  wallet: WalletWithSolanaFeatures,
  defaultChain: PrivySolanaWalletStandardChain,
): WalletWithSolanaFeatures {
  const features = wallet.features as unknown as MutableSolanaFeatureBundle;
  const nextFeatures: MutableSolanaFeatureBundle = { ...features };

  const signTxBlock = nextFeatures[SolanaSignTransaction];
  if (signTxBlock?.signTransaction) {
    const signTransaction = signTxBlock.signTransaction.bind(signTxBlock);
    nextFeatures[SolanaSignTransaction] = {
      ...signTxBlock,
      signTransaction: async (...inputs: readonly SolanaSignTransactionInput[]) =>
        signTransaction(
          ...inputs.map((input) =>
            input.chain ? input : { ...input, chain: defaultChain },
          ),
        ),
    };
  }

  const sendBlock = nextFeatures[SolanaSignAndSendTransaction];
  if (sendBlock?.signAndSendTransaction) {
    const signAndSendTransaction = sendBlock.signAndSendTransaction.bind(sendBlock);
    nextFeatures[SolanaSignAndSendTransaction] = {
      ...sendBlock,
      signAndSendTransaction: async (...inputs: readonly SolanaSignAndSendTransactionInput[]) =>
        signAndSendTransaction(
          ...inputs.map((input) =>
            input.chain ? input : { ...input, chain: defaultChain },
          ),
        ),
    };
  }

  // Privy's `standardWallet` can be a class instance: `{ ...wallet }` drops prototype getters
  // like `accounts`, which breaks `accounts.find(...)` in Umbra's signer bridge.
  return {
    version: wallet.version,
    name: wallet.name,
    icon: wallet.icon,
    chains: wallet.chains,
    accounts: wallet.accounts,
    features: nextFeatures as unknown as WalletWithSolanaFeatures["features"],
  };
}

/**
 * Bridge Privy's Wallet Standard Solana wallet to Umbra's IUmbraSigner.
 */
export function createUmbraSignerFromPrivyWallet(
  privyWallet: ConnectedStandardSolanaWallet,
  options: { solanaChain: PrivySolanaWalletStandardChain },
) {
  const standardWallet = injectDefaultSolanaChainOnWalletStandardWallet(
    privyWallet.standardWallet as WalletWithSolanaFeatures,
    options.solanaChain,
  );
  const account = standardWallet.accounts.find((a) => a.address === privyWallet.address);
  if (!account) {
    throw new Error("Could not resolve Wallet Standard account for your Solana wallet.");
  }
  return createSignerFromWalletAccount(standardWallet, account);
}
