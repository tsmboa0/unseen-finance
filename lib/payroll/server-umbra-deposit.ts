import { address } from "@solana/kit";
import {
  getDefaultMasterSeedStorage,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  getUmbraClient,
} from "@umbra-privacy/sdk";

import type { CreateSolanaKitSignerInput } from "@privy-io/node/solana-kit";

import { createUmbraSignerFromPrivyServer } from "@/lib/umbra/privy-server-signer";
import type { PrivyClient } from "@privy-io/node";

import {
  payrollStableMint,
  toPayrollRawUnits,
  type PayrollCurrency,
  PAYROLL_TOKEN_DECIMALS,
} from "@/lib/payroll/constants";
import { getDefaultSolanaEndpoints, getDefaultUmbraIndexerUrl } from "@/lib/solana-endpoints";

type MerchantLike = {
  network: string;
  walletAddress: string | null;
};

type PayrollWalletAuthorization = NonNullable<CreateSolanaKitSignerInput["authorizationContext"]>;

export async function createPayrollServerUmbraClient(
  privy: PrivyClient,
  merchant: MerchantLike,
  walletId: string,
  authorizationContext: PayrollWalletAuthorization,
) {
  if (!merchant.walletAddress) throw new Error("Merchant has no wallet address.");
  const endpoints = getDefaultSolanaEndpoints(merchant.network);
  const signer = createUmbraSignerFromPrivyServer(privy, {
    walletId,
    address: address(merchant.walletAddress),
    authorizationContext,
  });
  return getUmbraClient(
    {
      signer,
      network: endpoints.umbraNetwork,
      rpcUrl: endpoints.rpcUrl,
      rpcSubscriptionsUrl: endpoints.rpcSubscriptionsUrl,
      deferMasterSeedSignature: false,
      indexerApiEndpoint: getDefaultUmbraIndexerUrl(merchant.network),
    },
    { masterSeedStorage: getDefaultMasterSeedStorage() },
  );
}

export async function depositPublicToRecipientEtaServer(args: {
  client: Awaited<ReturnType<typeof getUmbraClient>>;
  merchantNetwork: string;
  destinationAddress: string;
  currency: PayrollCurrency;
  amountDisplay: string;
}): Promise<{ txSignature: string | null }> {
  const mint = payrollStableMint(args.currency, args.merchantNetwork);
  const rawAmount = toPayrollRawUnits(args.amountDisplay, PAYROLL_TOKEN_DECIMALS);
  if (rawAmount <= BigInt(0)) throw new Error("Invalid amount.");

  let txSignature: string | null = null;
  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client: args.client });
  const result = await deposit(
    args.destinationAddress.trim() as never,
    mint as never,
    rawAmount as never,
  );
  const q = result.queueSignature;
  const c = result.callbackSignature;
  txSignature =
    (typeof c === "string" && c.length > 0 ? c : null) ??
    (typeof q === "string" && q.length > 0 ? q : null);

  return { txSignature };
}
