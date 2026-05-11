import {
  createSignerFromPrivateKeyBytes,
  getClaimableUtxoScannerFunction,
  getDefaultMasterSeedStorage,
  getPublicBalanceToSelfClaimableUtxoCreatorFunction,
  getSelfClaimableUtxoToPublicBalanceClaimerFunction,
  getUmbraClient,
  getUmbraRelayer,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
} from "@umbra-privacy/sdk";
import { isClaimUtxoError, isFetchUtxosError, isRegistrationError } from "@umbra-privacy/sdk/errors";
import {
  getClaimSelfClaimableUtxoIntoPublicBalanceProver,
  getCreateSelfClaimableUtxoFromPublicBalanceProver,
  getUserRegistrationProver,
} from "@umbra-privacy/web-zk-prover";

import { loadGiftAdminSecretKeyBytes } from "@/lib/gift-cards/admin-wallet";
import { getDefaultSolanaEndpoints, getDefaultUmbraIndexerUrl, getDefaultUmbraRelayerUrl } from "@/lib/solana-endpoints";

function randomU256(): bigint {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  let x = BigInt(0);
  for (let i = 0; i < 32; i++) x = (x << BigInt(8)) | BigInt(b[i]!);
  return x;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureGiftAdminRegistered(
  client: Awaited<ReturnType<typeof getUmbraClient>>,
  addressStr: string,
): Promise<void> {
  try {
    const query = getUserAccountQuerierFunction({ client });
    await query(addressStr as never);
    return;
  } catch {
    /* not registered or transient indexer/RPC failure — try registration below */
  }
  try {
    const zkProver = getUserRegistrationProver();
    const register = getUserRegistrationFunction({ client }, { zkProver });
    await register({ confidential: true, anonymous: true });
  } catch (e) {
    if (isRegistrationError(e)) return;
    throw e;
  }
}

function destKey(dest: unknown): string {
  return String(dest ?? "");
}

type ScannedSelf = {
  destinationAddress?: unknown;
  treeIndex?: bigint | number;
  insertionIndex?: bigint | number;
};

function toBigIns(v: bigint | number | undefined | null): bigint {
  if (v === undefined || v === null) return BigInt(0);
  return BigInt(v);
}

function isBetterPick(tree: number, ins: bigint, bestTree: number, bestIns: bigint): boolean {
  return tree > bestTree || (tree === bestTree && ins > bestIns);
}

export type GiftUmbraPayoutResult = {
  createTxSig: string;
  claimTxSig: string;
  claimedTreeIndex: number;
  /** Decimal string — safe for arbitrary Umbra leaf indices. */
  claimedInsertionIndex: string;
};

/**
 * Creates a public→mixer self-claimable UTXO paying out to `recipientAddress`, then claims it to that wallet's SPL ATA.
 *
 * `claimedUtxoBaselineByTree`: persisted floors (per tree) from prior successful claims so the next redemption
 * does not treat older leaves as the freshly created UTXO when the indexer view differs from the last claim.
 */
export async function createAndClaimSelfGiftUtxo(args: {
  merchantNetwork: string;
  recipientAddress: string;
  faceAmountRaw: bigint;
  mint: string;
  claimedUtxoBaselineByTree?: Map<number, bigint>;
}): Promise<GiftUmbraPayoutResult> {
  const endpoints = getDefaultSolanaEndpoints(args.merchantNetwork);
  const secretBytes = loadGiftAdminSecretKeyBytes();
  const signer = await createSignerFromPrivateKeyBytes(secretBytes);
  const client = await getUmbraClient(
    {
      signer,
      network: endpoints.umbraNetwork,
      rpcUrl: endpoints.rpcUrl,
      rpcSubscriptionsUrl: endpoints.rpcSubscriptionsUrl,
      deferMasterSeedSignature: false,
      indexerApiEndpoint: getDefaultUmbraIndexerUrl(args.merchantNetwork),
    },
    { masterSeedStorage: getDefaultMasterSeedStorage() },
  );

  await ensureGiftAdminRegistered(client, String(signer.address));

  const scan = getClaimableUtxoScannerFunction({ client });
  const recipient = args.recipientAddress.trim();
  const savedFloorByTree = args.claimedUtxoBaselineByTree ?? new Map<number, bigint>();

  /** Max insertion index for this recipient per tree, merged with persisted claim floors. */
  async function scanBaselineByTree(): Promise<Map<number, bigint>> {
    const m = new Map<number, bigint>();
    const maxTrees = 16;
    for (let tree = 0; tree < maxTrees; tree++) {
      try {
        const scanResult = await scan(BigInt(tree) as never, BigInt(0) as never);
        const bucket = [...(scanResult.publicSelfBurnable ?? [])] as unknown as ScannedSelf[];
        let maxLive = BigInt(-1);
        for (const u of bucket) {
          if (destKey(u.destinationAddress) !== recipient) continue;
          const ins = toBigIns(u.insertionIndex);
          if (ins > maxLive) maxLive = ins;
        }
        const saved = savedFloorByTree.get(tree) ?? BigInt(-1);
        const floor = maxLive > saved ? maxLive : saved;
        m.set(tree, floor);
      } catch (e) {
        if (!isFetchUtxosError(e)) throw e;
        const saved = savedFloorByTree.get(tree) ?? BigInt(-1);
        m.set(tree, saved);
      }
    }
    return m;
  }

  const baseline = await scanBaselineByTree();

  const createZk = getCreateSelfClaimableUtxoFromPublicBalanceProver();
  const createUtxo = getPublicBalanceToSelfClaimableUtxoCreatorFunction({ client }, { zkProver: createZk } as never);

  const generationIndex = randomU256();
  const createOut = (await createUtxo(
    {
      amount: args.faceAmountRaw as never,
      destinationAddress: args.recipientAddress.trim() as never,
      mint: args.mint as never,
    },
    { generationIndex: generationIndex as never },
  )) as { createUtxoSignature?: string; createProofAccountSignature?: string; closeProofAccountSignature?: string };

  const createTxSig =
    createOut.createUtxoSignature ??
    createOut.createProofAccountSignature ??
    createOut.closeProofAccountSignature ??
    "";
  if (!createTxSig) {
    throw new Error("Create self-claimable UTXO returned no transaction signature.");
  }

  if (!client.fetchBatchMerkleProof) {
    throw new Error("Umbra client missing fetchBatchMerkleProof (check NEXT_PUBLIC_UMBRA_INDEXER_URL).");
  }

  type Picked = { utxo: ScannedSelf; treeIndex: number };

  async function pickNewSelfClaimableUtxo(): Promise<Picked | null> {
    let candidate: ScannedSelf | null = null;
    let bestTree = 0;
    let bestIns = BigInt(-1);
    for (let attempt = 0; attempt < 20; attempt++) {
      if (attempt > 0) await sleep(2000);
      const maxTrees = 16;
      for (let tree = 0; tree < maxTrees; tree++) {
        let scanResult: Awaited<ReturnType<typeof scan>>;
        try {
          scanResult = await scan(BigInt(tree) as never, BigInt(0) as never);
        } catch (e) {
          if (isFetchUtxosError(e)) continue;
          throw e;
        }
        const bucket = [...(scanResult.publicSelfBurnable ?? [])] as unknown as ScannedSelf[];
        const minIns = baseline.get(tree) ?? BigInt(-1);
        for (const u of bucket) {
          if (destKey(u.destinationAddress) !== recipient) continue;
          const ti = Number(u.treeIndex ?? tree);
          const ins = toBigIns(u.insertionIndex);
          if (ins <= minIns) continue;
          if (!candidate || isBetterPick(ti, ins, bestTree, bestIns)) {
            candidate = u;
            bestTree = ti;
            bestIns = ins;
          }
        }
      }
      if (candidate) return { utxo: candidate, treeIndex: bestTree };
    }
    return null;
  }

  const picked = await pickNewSelfClaimableUtxo();
  if (!picked) {
    throw new Error("Timed out waiting for indexer to show the new self-claimable UTXO. You can retry claim.");
  }

  const insertionRaw = picked.utxo.insertionIndex;
  if (insertionRaw === undefined || insertionRaw === null) {
    throw new Error("Indexer returned self-claimable UTXO without insertionIndex (cannot fetch Merkle proof).");
  }
  const treeIndexForClaim =
    picked.utxo.treeIndex != null
      ? BigInt(picked.utxo.treeIndex as bigint | number)
      : BigInt(picked.treeIndex);
  const insertionIndexForClaim = BigInt(insertionRaw as bigint | number);
  const utxoForClaim = {
    ...picked.utxo,
    treeIndex: treeIndexForClaim,
    insertionIndex: insertionIndexForClaim,
  };

  const claimZk = getClaimSelfClaimableUtxoIntoPublicBalanceProver();
  const relayer = getUmbraRelayer({ apiEndpoint: getDefaultUmbraRelayerUrl(args.merchantNetwork) });
  const claim = getSelfClaimableUtxoToPublicBalanceClaimerFunction(
    { client },
    {
      zkProver: claimZk,
      relayer,
      fetchBatchMerkleProof: client.fetchBatchMerkleProof,
    } as never,
  );

  let claimResult: Awaited<ReturnType<typeof claim>>;
  try {
    claimResult = await claim([utxoForClaim as never]);
  } catch (e) {
    if (isClaimUtxoError(e)) {
      throw new Error(`Umbra claim failed: ${e.message}`);
    }
    throw e;
  }

  let claimTxSig = "";
  for (const batch of claimResult.batches.values()) {
    if (batch.status === "completed" && batch.txSignature) {
      claimTxSig = batch.txSignature;
      break;
    }
  }
  if (!claimTxSig) {
    throw new Error("Gift claim did not produce a completed transaction.");
  }

  const claimedTreeIndex = picked.treeIndex;
  const claimedInsertionIndex = insertionIndexForClaim.toString();

  return { createTxSig, claimTxSig, claimedTreeIndex, claimedInsertionIndex };
}
