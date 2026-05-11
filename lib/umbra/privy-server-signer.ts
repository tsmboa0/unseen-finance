import type { IUmbraSigner } from "@umbra-privacy/sdk/interfaces";
import type { PrivyClient } from "@privy-io/node";
import {
  createSolanaKitSigner,
  type CreateSolanaKitSignerInput,
} from "@privy-io/node/solana-kit";
import { createSignableMessage } from "@solana/signers";

/**
 * Adapts Privy's server {@link createSolanaKitSigner} to Umbra's {@link IUmbraSigner}.
 * Same merge pattern as Umbra's internal `convertSolanaKitKeypairSignerToIUmbraSigner`.
 */
export function createUmbraSignerFromPrivyServer(
  client: PrivyClient,
  input: CreateSolanaKitSignerInput,
): IUmbraSigner {
  const partial = createSolanaKitSigner(client, input);

  return {
    address: partial.address,

    async signTransaction(transaction) {
      const [sigDict] = await partial.signTransactions([transaction as never]);
      return {
        ...transaction,
        signatures: { ...transaction.signatures, ...sigDict },
      } as Awaited<ReturnType<IUmbraSigner["signTransaction"]>>;
    },

    async signTransactions(transactions) {
      const sigDicts = await partial.signTransactions(transactions as never);
      return transactions.map((tx, index) => ({
        ...tx,
        signatures: { ...tx.signatures, ...sigDicts[index] },
      })) as Awaited<ReturnType<IUmbraSigner["signTransactions"]>>;
    },

    async signMessage(message) {
      const [sigDict] = await partial.signMessages([createSignableMessage(message)]);
      const signature = sigDict[partial.address];
      if (!signature) {
        throw new Error("Privy signMessage did not return a signature for this wallet address.");
      }
      return { message, signature, signer: partial.address };
    },
  };
}
