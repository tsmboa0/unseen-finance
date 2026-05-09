"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useRouter } from "next/navigation";
import { getAddressDecoder } from "@solana/addresses";
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
import { getTransferSolInstruction } from "@solana-program/system";
import {
  getClaimableUtxoScannerFunction,
  getEncryptedBalanceQuerierFunction,
  getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
  getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getUmbraClient,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";
import {
  getCreateReceiverClaimableUtxoFromEncryptedBalanceProver,
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver,
} from "@umbra-privacy/web-zk-prover";

type UTXO = {
  id: string;
  amount: number;
  currency: "SOL" | "USDC" | "USDT";
  usdValue: number;
  age: string;
  sender: string;
  status: "claimable" | "claiming" | "claimed";
};
import { useMerchantApi } from "@/hooks/use-merchant-api";
import { getDefaultSolanaEndpoints, getDefaultUmbraIndexerUrl, getDefaultUmbraRelayerUrl } from "@/lib/solana-endpoints";
import { createUmbraLocalMasterSeedStorage } from "@/lib/umbra/master-seed-storage";
import { createUmbraSignerFromPrivyWallet } from "@/lib/umbra/privy-signer";

type Currency = "USDC" | "USDT" | "SOL";
type TokenBalance = { currency: Currency; amount: number; usdValue: number };
type PrivateTransferType = "encrypted" | "utxo";
type PublicTransferMode = "normal" | "utxo";
type UtxoStatus = UTXO["status"];
type ClaimableUtxo = UTXO & { status: UtxoStatus; claimableData?: unknown };
type DbUtxoRow = {
  id: string;
  treeIndex: number;
  insertionIndex: number;
  amount: number;
  currency: Currency;
  usdValue: number;
  sender: string;
  age: string;
  status: UtxoStatus;
  unlockerType?: string;
};

const ETA_TO_ETA_UNSUPPORTED_MSG =
  "Encrypted balance → encrypted balance transfers are not exposed by this Umbra SDK build. Use “Receiver claims UTXO” instead.";

const DEVNET_MINTS: Record<Exclude<Currency, "SOL">, string> = {
  USDC: "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7",
  USDT: "DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6",
};

const TOKEN_DECIMALS: Record<Exclude<Currency, "SOL">, number> = {
  USDC: 6,
  USDT: 6,
};

function toRawUnits(amount: string, decimals: number): bigint {
  const [wholeRaw, fractionRaw = ""] = amount.trim().split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  const fraction = fractionRaw.slice(0, decimals).padEnd(decimals, "0");
  return BigInt(`${whole}${fraction}`);
}

function fromRawUnits(value: bigint, decimals: number): number {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  const fractionAsNumber = Number(fraction) / 10 ** decimals;
  return Number(whole) + fractionAsNumber;
}

function coerceNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "bigint" && value >= BigInt(0) && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const n = Number(value.trim());
    if (Number.isSafeInteger(n) && n >= 0) return n;
  }
  return null;
}

function toBigIntUnknown(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return BigInt(value.trim());
  return BigInt(0);
}

function shortSolAddress(addr: string): string {
  const s = addr.trim();
  if (s.length <= 12) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function mintBytesFromU128LowHigh(low: bigint, high: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = low;
  const mask = BigInt(0xff);
  const shift = BigInt(8);
  for (let i = 0; i < 16; i++) {
    out[i] = Number(v & mask);
    v >>= shift;
  }
  v = high;
  for (let i = 16; i < 32; i++) {
    out[i] = Number(v & mask);
    v >>= shift;
  }
  return out;
}

function mintAddressFromClaimableData(claimableData: unknown): string | null {
  const c = claimableData as Record<string, unknown>;
  let low: unknown;
  let high: unknown;
  const h1 = c.h1Components as Record<string, unknown> | undefined;
  if (h1 && typeof h1 === "object") {
    low = h1.mintAddressLow;
    high = h1.mintAddressHigh;
  } else {
    low = c.mintAddressLow;
    high = c.mintAddressHigh;
  }
  const lowB = toBigIntUnknown(low);
  const highB = toBigIntUnknown(high);
  if (lowB === BigInt(0) && highB === BigInt(0)) return null;
  try {
    const bytes = mintBytesFromU128LowHigh(lowB, highB);
    return getAddressDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function currencyFromMintAddress(mint: string | null): Exclude<Currency, "SOL"> {
  if (mint === DEVNET_MINTS.USDT) return "USDT";
  return "USDC";
}

function isReceiverClaimableUnlocker(claimableData: unknown): boolean {
  const t = (claimableData as { unlockerType?: string }).unlockerType;
  return t === "received" || t === "public-received";
}

function getStableUtxoIdFromClaimable(claimableData: unknown, fallbackIndex: number): string {
  const c = claimableData as { treeIndex?: unknown; insertionIndex?: unknown };
  const treeIndex = coerceNonNegativeInt(c.treeIndex) ?? 0;
  const insertionIndex = coerceNonNegativeInt(c.insertionIndex) ?? fallbackIndex;
  return `utxo_${treeIndex}_${insertionIndex}`;
}

function parseUtxoId(id: string): { treeIndex: number; insertionIndex: number } | null {
  const m = /^utxo_(\d+)_(\d+)$/.exec(id.trim());
  if (!m) return null;
  return { treeIndex: Number(m[1]), insertionIndex: Number(m[2]) };
}

const CLAIM_SUCCESS_DISPLAY_MS = 900;
const CLAIM_BALANCE_REFRESH_RETRIES = 3;
const CLAIM_BALANCE_REFRESH_WAIT_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emitDashboardRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("dashboard:refresh"));
}

function claimableRowFromScanData(claimableData: unknown, fallbackIndex: number): ClaimableUtxo {
  const id = getStableUtxoIdFromClaimable(claimableData, fallbackIndex);
  const c = claimableData as { amount?: unknown; destinationAddress?: unknown };
  const rawAmount = toBigIntUnknown(c.amount);
  const mintAddr = mintAddressFromClaimableData(claimableData);
  const currency = currencyFromMintAddress(mintAddr);
  const decimals = TOKEN_DECIMALS[currency];
  const amount = fromRawUnits(rawAmount, decimals);
  const dest = typeof c.destinationAddress === "string" ? c.destinationAddress : "";
  return {
    id,
    amount,
    currency,
    usdValue: amount,
    age: "",
    sender: dest ? shortSolAddress(dest) : "",
    status: "claimable",
    claimableData,
  };
}

export function useUmbraPrivateActions() {
  const { getAccessToken } = usePrivy();
  const router = useRouter();
  const { merchant } = useMerchantApi();
  const { ready: walletsReady, wallets } = useWallets();

  const [privateBalances, setPrivateBalances] = useState<TokenBalance[]>([
    { currency: "SOL", amount: 0, usdValue: 0 },
    { currency: "USDC", amount: 0, usdValue: 0 },
    { currency: "USDT", amount: 0, usdValue: 0 },
  ]);
  const [utxos, setUtxos] = useState<ClaimableUtxo[]>([]);
  const utxosRef = useRef<ClaimableUtxo[]>([]);
  const claimableDataByIdRef = useRef<Map<string, unknown>>(new Map());
  const [syncingPrivateBalances, setSyncingPrivateBalances] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncingClaimableUtxos, setSyncingClaimableUtxos] = useState(false);

  const getPrivyTokenOrRedirect = useCallback(async (): Promise<string> => {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/");
      throw new Error("Session expired. Redirecting to landing page.");
    }
    return token;
  }, [getAccessToken, router]);

  useEffect(() => {
    utxosRef.current = utxos;
  }, [utxos]);

  const fetchDbClaimableUtxos = useCallback(
    async (privyToken: string): Promise<ClaimableUtxo[]> => {
      const res = await fetch("/api/dashboard/umbra-utxos", {
        headers: { Authorization: `Bearer ${privyToken}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `UTXO DB HTTP ${res.status}`);
      }
      const payload = (await res.json()) as { utxos?: DbUtxoRow[] };
      const rows = Array.isArray(payload.utxos) ? payload.utxos : [];
      return rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        currency: r.currency,
        usdValue: r.usdValue,
        age: r.age ?? "",
        sender: r.sender ?? "",
        status: r.status,
        claimableData: claimableDataByIdRef.current.get(r.id),
      }));
    },
    [],
  );

  const syncScannedUtxosToDb = useCallback(
    async (privyToken: string, scanned: ClaimableUtxo[]) => {
      const payload = scanned
        .map((u) => {
          const parsed = parseUtxoId(u.id);
          const raw = u.claimableData as { unlockerType?: unknown } | undefined;
          if (!parsed) return null;
          return {
            treeIndex: parsed.treeIndex,
            insertionIndex: parsed.insertionIndex,
            amount: u.amount,
            currency: u.currency,
            usdValue: u.usdValue,
            sender: u.sender,
            age: u.age,
            unlockerType: typeof raw?.unlockerType === "string" ? raw.unlockerType : "",
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      if (payload.length === 0) return;
      await fetch("/api/dashboard/umbra-utxos", {
        method: "POST",
        headers: { Authorization: `Bearer ${privyToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ utxos: payload }),
      });
    },
    [],
  );

  const updateDbUtxoStatus = useCallback(
    async (privyToken: string, ids: string[], status: UtxoStatus, claimError?: string) => {
      if (ids.length === 0) return;
      try {
        const res = await fetch("/api/dashboard/umbra-utxos", {
          method: "PATCH",
          headers: { Authorization: `Bearer ${privyToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ids, status, claimError }),
        });
        if (!res.ok) {
          console.warn("[Umbra][claim] Skipping DB status update due to HTTP error", {
            status: res.status,
            statusText: res.statusText,
            ids,
          });
        }
      } catch (err) {
        console.warn("[Umbra][claim] Skipping DB status update due to request error", { ids, err });
      }
    },
    [],
  );

  const logDashboardEvent = useCallback(
    async (
      privyToken: string,
      payload: {
        category: string;
        direction?: "in" | "out";
        status?: "completed" | "pending" | "failed";
        amount: number;
        currency: "USDC" | "USDT" | "SOL";
        counterparty?: string;
        memo?: string;
        txHash?: string;
        metadata?: Record<string, unknown>;
      },
    ) => {
      try {
        await fetch("/api/dashboard/events", {
          method: "POST",
          headers: { Authorization: `Bearer ${privyToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // non-blocking analytics event
      } finally {
        emitDashboardRefresh();
      }
    },
    [],
  );

  const privySolanaWallet = useMemo(() => {
    if (!walletsReady || wallets.length === 0) return null;
    if (merchant?.walletAddress) {
      return wallets.find((w) => w.address === merchant.walletAddress) ?? null;
    }
    return wallets[0] ?? null;
  }, [merchant?.walletAddress, wallets, walletsReady]);

  const canUseUmbraActions =
    Boolean(merchant?.umbraRegistered) &&
    Boolean(merchant?.walletAddress) &&
    Boolean(privySolanaWallet) &&
    privySolanaWallet?.address === merchant?.walletAddress;

  const withUmbraClient = useCallback(
    async <T,>(fn: (client: Awaited<ReturnType<typeof getUmbraClient>>) => Promise<T>): Promise<T> => {
      if (!merchant || !merchant.walletAddress || !privySolanaWallet) {
        throw new Error("Connect your Privy Solana wallet first.");
      }
      if (!merchant.umbraRegistered) {
        throw new Error("Complete Umbra registration before private actions.");
      }
      if (privySolanaWallet.address !== merchant.walletAddress) {
        throw new Error("Wallet mismatch: active Privy wallet does not match merchant wallet.");
      }

      const endpoints = getDefaultSolanaEndpoints(merchant.network);
      const indexerApiEndpoint = getDefaultUmbraIndexerUrl(merchant.network);
      const signer = createUmbraSignerFromPrivyWallet(privySolanaWallet, {
        solanaChain: endpoints.privySolanaChain,
      });
      const client = await getUmbraClient(
        {
        signer,
        network: endpoints.umbraNetwork,
        rpcUrl: endpoints.rpcUrl,
        rpcSubscriptionsUrl: endpoints.rpcSubscriptionsUrl,
        deferMasterSeedSignature: false,
        indexerApiEndpoint,
        },
        {
          masterSeedStorage: createUmbraLocalMasterSeedStorage({
            walletAddress: merchant.walletAddress,
            network: merchant.network,
          }),
        },
      );
      return fn(client);
    },
    [merchant, privySolanaWallet],
  );

  const refreshClaimableUtxos = useCallback(async () => {
    if (!canUseUmbraActions) return;
    setSyncingClaimableUtxos(true);
    try {
      console.groupCollapsed("[Umbra][scan] Starting UTXO scan");
      const privyToken = await getPrivyTokenOrRedirect();

      const cursorRes = await fetch("/api/dashboard/umbra-scan-cursor", {
        headers: { Authorization: `Bearer ${privyToken}` },
      });
      if (!cursorRes.ok) {
        const body = (await cursorRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Cursor HTTP ${cursorRes.status}`);
      }
      const cursorJson = (await cursorRes.json()) as { treeIndex?: unknown; nextInsertionIndex?: unknown };
      const nextInsertionIndex = coerceNonNegativeInt(cursorJson.nextInsertionIndex) ?? 0;
      console.log("[Umbra][scan] Cursor from API:", cursorJson);
      console.log("[Umbra][scan] Normalized scan input:", {
        treeIndex: 0,
        nextInsertionIndex,
      });

      const result = await withUmbraClient(async (client) => {
        const scan = getClaimableUtxoScannerFunction({ client });
        // SDK already paginates internally and returns the exact next cursor to persist.
        console.log("[Umbra][scan] Calling SDK scan()", {
          treeIndex: 0,
          insertionIndexStart: nextInsertionIndex,
        });
        return await scan(BigInt(0) as never, BigInt(nextInsertionIndex) as never);
      });

      const received = [
        ...(result.received ?? []),
        ...(result.publicReceived ?? []),
      ] as unknown[];
      console.log("[Umbra][scan] Raw scan result:", {
        receivedCount: (result.received ?? []).length,
        publicReceivedCount: (result.publicReceived ?? []).length,
        nextScanStartIndex: (result as { nextScanStartIndex?: unknown }).nextScanStartIndex,
      });

      const nextUtxos: ClaimableUtxo[] = received
        .filter(isReceiverClaimableUnlocker)
        .map((claimableData, index) => claimableRowFromScanData(claimableData, index));
      for (const u of nextUtxos) {
        if (u.claimableData !== undefined) {
          claimableDataByIdRef.current.set(u.id, u.claimableData);
        }
      }
      console.table(
        nextUtxos.map((u, i) => {
          const c = u.claimableData as { treeIndex?: unknown; insertionIndex?: unknown; unlockerType?: unknown };
          return {
            row: i,
            id: u.id,
            treeIndex: String(c.treeIndex ?? "n/a"),
            insertionIndex: String(c.insertionIndex ?? "n/a"),
            unlockerType: String(c.unlockerType ?? "n/a"),
            amount: u.amount,
            currency: u.currency,
          };
        }),
      );

      await syncScannedUtxosToDb(privyToken, nextUtxos);
      const dbUtxos = await fetchDbClaimableUtxos(privyToken);
      setUtxos(dbUtxos);

      const nextScanStartIndexRaw = (result as { nextScanStartIndex?: bigint | number }).nextScanStartIndex;
      const nextScanStartIndex =
        typeof nextScanStartIndexRaw === "bigint"
          ? Number(nextScanStartIndexRaw)
          : typeof nextScanStartIndexRaw === "number"
            ? nextScanStartIndexRaw
            : nextInsertionIndex;
      console.log("[Umbra][scan] Persisting next cursor:", {
        treeIndex: 0,
        nextInsertionIndex: nextScanStartIndex,
      });

      await fetch("/api/dashboard/umbra-scan-cursor", {
        method: "POST",
        headers: { Authorization: `Bearer ${privyToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          treeIndex: 0,
          nextInsertionIndex: nextScanStartIndex,
        }),
      });

      const refreshedDbUtxos = await fetchDbClaimableUtxos(privyToken);
      setUtxos(refreshedDbUtxos);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch claimable UTXOs.";
      console.error("[Umbra][scan] Scan failed:", e);
      setActionError(msg);
    } finally {
      console.groupEnd();
      setSyncingClaimableUtxos(false);
    }
  }, [canUseUmbraActions, fetchDbClaimableUtxos, getPrivyTokenOrRedirect, syncScannedUtxosToDb, withUmbraClient]);

  const refreshPrivateBalances = useCallback(async () => {
    if (!canUseUmbraActions) return;
    setSyncingPrivateBalances(true);
    try {
      const balances = await withUmbraClient(async (client) => {
        const queryEncrypted = getEncryptedBalanceQuerierFunction({ client });
        const result = await queryEncrypted([DEVNET_MINTS.USDC as never, DEVNET_MINTS.USDT as never] as never);
        const mapResult = result as unknown as Map<string, unknown>;

        const usdc = mapResult.get(DEVNET_MINTS.USDC) as { state?: string; balance?: bigint } | undefined;
        const usdt = mapResult.get(DEVNET_MINTS.USDT) as { state?: string; balance?: bigint } | undefined;

        const usdcAmount =
          usdc?.state === "shared" && typeof usdc.balance === "bigint"
            ? fromRawUnits(usdc.balance, TOKEN_DECIMALS.USDC)
            : 0;
        const usdtAmount =
          usdt?.state === "shared" && typeof usdt.balance === "bigint"
            ? fromRawUnits(usdt.balance, TOKEN_DECIMALS.USDT)
            : 0;

        return [
          { currency: "SOL", amount: 0, usdValue: 0 },
          { currency: "USDC", amount: usdcAmount, usdValue: usdcAmount },
          { currency: "USDT", amount: usdtAmount, usdValue: usdtAmount },
        ] as TokenBalance[];
      });

      setPrivateBalances(balances);
      setActionError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch private balances.";
      setActionError(msg);
    } finally {
      setSyncingPrivateBalances(false);
    }
  }, [canUseUmbraActions, withUmbraClient]);

  useEffect(() => {
    void refreshPrivateBalances();
  }, [refreshPrivateBalances]);

  useEffect(() => {
    void refreshClaimableUtxos();
  }, [refreshClaimableUtxos]);

  const shieldFromPublic = useCallback(
    async (currency: Currency, amount: string) => {
      if (currency === "SOL") {
        throw new Error("SOL shielding is not wired in this UI yet. Use USDC or USDT.");
      }
      const mint = DEVNET_MINTS[currency];
      const rawAmount = toRawUnits(amount, TOKEN_DECIMALS[currency]);
      if (rawAmount <= BigInt(0)) throw new Error("Enter a valid amount.");

      await withUmbraClient(async (client) => {
        const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
        await deposit(client.signer.address as never, mint as never, rawAmount as never);
      });
      const privyToken = await getPrivyTokenOrRedirect();
      await logDashboardEvent(privyToken, {
        category: "shield",
        direction: "out",
        status: "completed",
        amount: Number(amount),
        currency,
        memo: "Shield from public balance",
      });
      await refreshPrivateBalances();
      setActionError(null);
    },
    [getPrivyTokenOrRedirect, logDashboardEvent, refreshPrivateBalances, withUmbraClient],
  );

  const unshieldToPublic = useCallback(
    async (currency: Currency, amount: string) => {
      if (currency === "SOL") {
        throw new Error("SOL unshielding is not wired in this UI yet. Use USDC or USDT.");
      }
      const mint = DEVNET_MINTS[currency];
      const rawAmount = toRawUnits(amount, TOKEN_DECIMALS[currency]);
      if (rawAmount <= BigInt(0)) throw new Error("Enter a valid amount.");

      await withUmbraClient(async (client) => {
        const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client });
        await withdraw(client.signer.address as never, mint as never, rawAmount as never);
      });
      const privyToken = await getPrivyTokenOrRedirect();
      await logDashboardEvent(privyToken, {
        category: "unshield",
        direction: "in",
        status: "completed",
        amount: Number(amount),
        currency,
        memo: "Unshield to public balance",
      });
      await refreshPrivateBalances();
      setActionError(null);
    },
    [getPrivyTokenOrRedirect, logDashboardEvent, refreshPrivateBalances, withUmbraClient],
  );

  const transferFromPrivate = useCallback(
    async (args: { currency: Currency; amount: string; destinationAddress: string; transferType: PrivateTransferType }) => {
      if (args.currency === "SOL") {
        throw new Error("Private SOL transfer is not wired in this UI yet. Use USDC or USDT.");
      }
      const mint = DEVNET_MINTS[args.currency];
      const rawAmount = toRawUnits(args.amount, TOKEN_DECIMALS[args.currency]);
      if (rawAmount <= BigInt(0)) throw new Error("Enter a valid amount.");
      if (!args.destinationAddress.trim()) throw new Error("Destination address is required.");

      await withUmbraClient(async (client) => {
        if (args.transferType === "encrypted") {
          throw new Error(ETA_TO_ETA_UNSUPPORTED_MSG);
        }

        const createReceiverClaimableUtxo = getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction(
          { client },
          { zkProver: getCreateReceiverClaimableUtxoFromEncryptedBalanceProver() },
        );
        await createReceiverClaimableUtxo({
          amount: rawAmount as never,
          destinationAddress: args.destinationAddress.trim() as never,
          mint: mint as never,
        });
      });
      const privyToken = await getPrivyTokenOrRedirect();
      await logDashboardEvent(privyToken, {
        category: "transfer",
        direction: "out",
        status: "completed",
        amount: Number(args.amount),
        currency: args.currency,
        counterparty: args.destinationAddress,
        memo: "Private balance transfer (receiver-claimable UTXO)",
      });

      await refreshPrivateBalances();
      setActionError(null);
    },
    [getPrivyTokenOrRedirect, logDashboardEvent, refreshPrivateBalances, withUmbraClient],
  );

  const claimReceiverUtxosIntoPrivate = useCallback(
    async (utxoIds: string[]) => {
      if (!canUseUmbraActions) throw new Error("Complete Umbra registration before claiming.");
      const privyToken = await getPrivyTokenOrRedirect();

      setUtxos((prev) =>
        prev.map((u) => (utxoIds.includes(u.id) ? { ...u, status: "claiming" as const } : u)),
      );

      const relayerApiEndpoint = merchant ? getDefaultUmbraRelayerUrl(merchant.network) : getDefaultUmbraRelayerUrl("devnet");
      const zkProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver();
      const relayer = getUmbraRelayer({ apiEndpoint: relayerApiEndpoint });

      try {
        await withUmbraClient(async (client) => {
          if (!client.fetchBatchMerkleProof) {
            throw new Error("Umbra indexer is not configured (missing fetchBatchMerkleProof).");
          }
          const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
            { client },
            { zkProver, relayer, fetchBatchMerkleProof: client.fetchBatchMerkleProof },
          );

          let selected = utxoIds
            .map((id) => claimableDataByIdRef.current.get(id))
            .filter((u): u is unknown => Boolean(u)) as never[];

          if (selected.length !== utxoIds.length) {
            // If a user reloaded after cursor moved ahead, hydrate missing claimable data with a full tree-0 rescan.
            const scan = getClaimableUtxoScannerFunction({ client });
            const full = await scan(BigInt(0) as never, BigInt(0) as never);
            const all = ([...(full.received ?? []), ...(full.publicReceived ?? [])] as unknown[])
              .filter(isReceiverClaimableUnlocker)
              .map((c, i) => claimableRowFromScanData(c, i));
            for (const row of all) {
              if (row.claimableData !== undefined) claimableDataByIdRef.current.set(row.id, row.claimableData);
            }
            selected = utxoIds
              .map((id) => claimableDataByIdRef.current.get(id))
              .filter((u): u is unknown => Boolean(u)) as never[];
          }

          if (selected.length !== utxoIds.length) {
            throw new Error("Some selected UTXOs could not be rehydrated from scanner data. Please refresh and retry.");
          }

          const claimResult = await claim(selected);
          const batchResults = Array.from(claimResult.batches.entries()).map(([batchIndex, batch]) => ({
            batchIndex: Number(batchIndex),
            requestId: batch.requestId,
            status: batch.status,
            txSignature: batch.txSignature,
            callbackSignature: batch.callbackSignature,
            failureReason: batch.failureReason,
          }));
          console.table(batchResults);

          const failed = batchResults.filter((b) => b.status !== "completed");
          if (failed.length > 0) {
            throw new Error(
              `Umbra claim did not complete for all batches: ${failed
                .map((f) => `batch ${f.batchIndex} => ${f.status}${f.failureReason ? ` (${f.failureReason})` : ""}`)
                .join("; ")}`,
            );
          }
        });

        setUtxos((prev) =>
          prev.map((u) => (utxoIds.includes(u.id) ? { ...u, status: "claimed" as const } : u)),
        );

        // Persist claimed state before refreshing from DB-backed list,
        // otherwise the just-claimed row can be re-added as claimable.
        if (privyToken) {
          await updateDbUtxoStatus(privyToken, utxoIds, "claimed");
        }
        const claimedAmount = utxoIds
          .map((id) => utxosRef.current.find((u) => u.id === id)?.amount ?? 0)
          .reduce((sum, n) => sum + n, 0);
        await logDashboardEvent(privyToken, {
          category: "claim",
          direction: "in",
          status: "completed",
          amount: claimedAmount,
          currency: "USDC",
          memo: `Claimed ${utxoIds.length} UTXO(s)`,
        });

        // Keep a brief success state in UI before removing claimed rows.
        await new Promise((resolve) => setTimeout(resolve, CLAIM_SUCCESS_DISPLAY_MS));
        setUtxos((prev) => prev.filter((u) => !utxoIds.includes(u.id)));

        // Balance updates can lag callback finalization by a short period.
        for (let attempt = 0; attempt < CLAIM_BALANCE_REFRESH_RETRIES; attempt += 1) {
          await refreshPrivateBalances();
          if (attempt < CLAIM_BALANCE_REFRESH_RETRIES - 1) {
            await sleep(CLAIM_BALANCE_REFRESH_WAIT_MS);
          }
        }
        await refreshClaimableUtxos();
        setActionError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Claim failed.";

        // "Nullifier already burnt" means the UTXO was already claimed on-chain
        // (e.g. claimed from another device or session). Silently mark it as claimed
        // in the DB and remove it from the unclaimed list so the user never sees it again.
        const alreadyClaimed = msg.toLowerCase().includes("nullifier already burnt");

        if (alreadyClaimed) {
          if (privyToken) {
            await updateDbUtxoStatus(privyToken, utxoIds, "claimed");
          }
          setUtxos((prev) => prev.filter((u) => !utxoIds.includes(u.id)));
          // Not a user-facing error — return quietly.
          return;
        }

        setActionError(msg);
        if (privyToken) {
          await updateDbUtxoStatus(privyToken, utxoIds, "claimable", msg);
        }
        setUtxos((prev) =>
          prev.map((u) => (utxoIds.includes(u.id) ? { ...u, status: "claimable" as const } : u)),
        );
        throw e;
      }
    },
    [
      canUseUmbraActions,
      getPrivyTokenOrRedirect,
      merchant,
      refreshClaimableUtxos,
      refreshPrivateBalances,
      updateDbUtxoStatus,
      logDashboardEvent,
      withUmbraClient,
    ],
  );

  const claimOne = useCallback(
    async (utxoId: string) => {
      await claimReceiverUtxosIntoPrivate([utxoId]);
    },
    [claimReceiverUtxosIntoPrivate],
  );

  const claimAll = useCallback(async () => {
    const ids = utxos.filter((u) => u.status === "claimable").map((u) => u.id);
    // SDK claim batches can fail when too many UTXOs are packed together.
    // Claim sequentially for reliability in UI "Claim all".
    for (const id of ids) {
      await claimReceiverUtxosIntoPrivate([id]);
    }
  }, [claimReceiverUtxosIntoPrivate, utxos]);

  const transferFromPublic = useCallback(
    async (args: { currency: Currency; amount: string; destinationAddress: string; transferMode: PublicTransferMode }) => {
      if (!merchant?.walletAddress || !privySolanaWallet) {
        throw new Error("Connect your Privy Solana wallet first.");
      }
      if (privySolanaWallet.address !== merchant.walletAddress) {
        throw new Error("Wallet mismatch: active Privy wallet does not match merchant wallet.");
      }

      if (args.transferMode === "utxo") {
        if (!merchant.umbraRegistered) {
          throw new Error("Complete Umbra registration before sending via receiver-claimable UTXO.");
        }
        if (args.currency === "SOL") {
          throw new Error("Public → receiver-claimable UTXO supports SPL tokens (USDC/USDT) only.");
        }
        const mint = DEVNET_MINTS[args.currency];
        const rawAmount = toRawUnits(args.amount, TOKEN_DECIMALS[args.currency]);
        if (rawAmount <= BigInt(0)) throw new Error("Enter a valid amount.");
        if (!args.destinationAddress.trim()) throw new Error("Destination address is required.");

        await withUmbraClient(async (client) => {
          const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
            { client },
            { zkProver: getCreateReceiverClaimableUtxoFromPublicBalanceProver() },
          );
          await createUtxo({
            amount: rawAmount as never,
            destinationAddress: args.destinationAddress.trim() as never,
            mint: mint as never,
          });
        });
        const privyToken = await getPrivyTokenOrRedirect();
        await logDashboardEvent(privyToken, {
          category: "transfer",
          direction: "out",
          status: "completed",
          amount: Number(args.amount),
          currency: args.currency,
          counterparty: args.destinationAddress,
          memo: "Public to receiver-claimable UTXO transfer",
        });
        return;
      }

      const endpoints = getDefaultSolanaEndpoints(merchant.network);
      const senderAddress = address(merchant.walletAddress);
      const destinationAddress = address(args.destinationAddress.trim());
      const payer = createNoopSigner(senderAddress);
      const rpc = createSolanaRpc(endpoints.rpcUrl);
      const { value: latestBlockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
      const instructions: any[] = [];

      if (args.currency === "SOL") {
        const rawLamports = toRawUnits(args.amount, 9);
        if (rawLamports <= BigInt(0)) throw new Error("Enter a valid amount.");
        instructions.push(
          getTransferSolInstruction({
            source: payer,
            destination: destinationAddress,
            amount: rawLamports,
          }),
        );
      } else {
        const mint = address(DEVNET_MINTS[args.currency]);
        const rawAmount = toRawUnits(args.amount, TOKEN_DECIMALS[args.currency]);
        if (rawAmount <= BigInt(0)) throw new Error("Enter a valid amount.");

        const [sourceAta] = await findAssociatedTokenPda({
          owner: senderAddress,
          tokenProgram: TOKEN_PROGRAM_ADDRESS,
          mint,
        });
        const [destinationAta] = await findAssociatedTokenPda({
          owner: destinationAddress,
          tokenProgram: TOKEN_PROGRAM_ADDRESS,
          mint,
        });
        instructions.push(
          await getCreateAssociatedTokenIdempotentInstructionAsync({
            payer,
            owner: destinationAddress,
            mint,
            tokenProgram: TOKEN_PROGRAM_ADDRESS,
          }),
          getTransferCheckedInstruction({
            source: sourceAta,
            mint,
            destination: destinationAta,
            authority: senderAddress,
            amount: rawAmount,
            decimals: TOKEN_DECIMALS[args.currency],
          }),
        );
      }

      const txMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayer(senderAddress, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        (m) => appendTransactionMessageInstructions(instructions, m),
      );
      const compiled = compileTransaction(txMessage);
      const wire = Uint8Array.from(getTransactionEncoder().encode(compiled));
      await privySolanaWallet.signAndSendTransaction({
        transaction: wire,
        chain: endpoints.privySolanaChain,
      });
      const privyToken = await getPrivyTokenOrRedirect();
      await logDashboardEvent(privyToken, {
        category: "transfer",
        direction: "out",
        status: "completed",
        amount: Number(args.amount),
        currency: args.currency,
        counterparty: args.destinationAddress,
        memo: "Public visible transfer",
      });
    },
    [getPrivyTokenOrRedirect, logDashboardEvent, merchant, privySolanaWallet, withUmbraClient],
  );

  return {
    privateBalances,
    utxos,
    setUtxos,
    canUseUmbraActions,
    syncingPrivateBalances,
    syncingClaimableUtxos,
    actionError,
    setActionError,
    refreshPrivateBalances,
    refreshClaimableUtxos,
    shieldFromPublic,
    unshieldToPublic,
    transferFromPrivate,
    transferFromPublic,
    claimOne,
    claimAll,
  };
}
