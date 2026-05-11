import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { getBase58Codec } from "@solana/codecs-strings";
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

import { getDefaultSolanaEndpoints } from "@/lib/solana-endpoints";

const USDC_DECIMALS = 6;

/**
 * Send USDC from the merchant's Privy wallet to the gift treasury ATA (SPL transfer + optional idempotent ATA create for treasury).
 * Opens the wallet approval modal; returns the base58 transaction signature.
 */
export async function signAndSendPrivyUsdcToGiftTreasury(args: {
  privyWallet: ConnectedStandardSolanaWallet;
  merchantWalletAddress: string;
  merchantNetwork: string;
  treasuryOwnerBase58: string;
  treasuryAtaBase58: string;
  mintBase58: string;
  amountRaw: bigint;
}): Promise<{ signatureBase58: string }> {
  const { privyWallet, merchantWalletAddress, merchantNetwork } = args;
  if (privyWallet.address !== merchantWalletAddress) {
    throw new Error("Active wallet does not match your merchant wallet. Switch wallet in Privy.");
  }
  if (args.amountRaw <= BigInt(0)) {
    throw new Error("Invalid funding amount.");
  }

  const endpoints = getDefaultSolanaEndpoints(merchantNetwork);
  const feePayer = address(merchantWalletAddress);
  const payer = createNoopSigner(feePayer);
  const mint = address(args.mintBase58);
  const destAta = address(args.treasuryAtaBase58);
  const treasuryOwner = address(args.treasuryOwnerBase58);

  const [sourceAta] = await findAssociatedTokenPda({
    owner: feePayer,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    mint,
  });

  const instructions: any[] = [
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      payer,
      owner: treasuryOwner,
      mint,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    }),
    getTransferCheckedInstruction({
      source: sourceAta,
      mint,
      destination: destAta,
      authority: feePayer,
      amount: args.amountRaw,
      decimals: USDC_DECIMALS,
    }),
  ];

  const rpc = createSolanaRpc(endpoints.rpcUrl);
  const { value: latestBlockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();

  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(feePayer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
  const compiled = compileTransaction(txMessage);
  const wire = Uint8Array.from(getTransactionEncoder().encode(compiled));

  const { signature } = await privyWallet.signAndSendTransaction({
    transaction: wire,
    chain: endpoints.privySolanaChain,
  });

  const signatureBase58 = getBase58Codec().decode(signature);
  return { signatureBase58 };
}
