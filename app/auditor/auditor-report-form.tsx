"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

export function AuditorReportForm() {
  const [network, setNetwork] = useState<"devnet" | "mainnet">("devnet");
  const [mintAddress, setMintAddress] = useState("");
  const [viewingKeyHex, setViewingKeyHex] = useState("");
  const [dateFromUtc, setDateFromUtc] = useState("");
  const [dateToUtc, setDateToUtc] = useState("");
  const [treeIndex, setTreeIndex] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const tree =
        treeIndex.trim() === "" ? undefined : Number.parseInt(treeIndex.trim(), 10);
      if (treeIndex.trim() !== "" && (!Number.isInteger(tree) || tree! < 0)) {
        setError("Tree index must be a non-negative integer or empty.");
        return;
      }

      const res = await fetch("/api/public/auditor/viewing-key-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network,
          mintAddress: mintAddress.trim(),
          viewingKeyHex: viewingKeyHex.trim(),
          dateFromUtc: dateFromUtc.trim() || null,
          dateToUtc: dateToUtc.trim() || null,
          treeIndex: treeIndex.trim() === "" ? null : tree,
        }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(j?.error ?? `Request failed (${res.status})`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `unseen-auditor-${network}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auditor-form glass-card">
      {error ? (
        <p className="auditor-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="auditor-form__grid">
        <label className="auditor-field">
          <span className="auditor-field__label">Network</span>
          <select
            className="auditor-field__input"
            value={network}
            onChange={(e) => setNetwork(e.target.value as "devnet" | "mainnet")}
          >
            <option value="devnet">Devnet</option>
            <option value="mainnet">Mainnet</option>
          </select>
        </label>
        <label className="auditor-field auditor-field--full">
          <span className="auditor-field__label">Mint</span>
          <input
            className="auditor-field__input"
            value={mintAddress}
            onChange={(e) => setMintAddress(e.target.value)}
            placeholder="SPL mint (base58)"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="auditor-field auditor-field--full">
          <span className="auditor-field__label">Viewing key</span>
          <textarea
            className="auditor-field__input auditor-field__textarea"
            value={viewingKeyHex}
            onChange={(e) => setViewingKeyHex(e.target.value)}
            placeholder="64 hex characters"
            rows={2}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="auditor-field">
          <span className="auditor-field__label">From (UTC)</span>
          <input
            className="auditor-field__input"
            type="date"
            value={dateFromUtc}
            onChange={(e) => setDateFromUtc(e.target.value)}
          />
        </label>
        <label className="auditor-field">
          <span className="auditor-field__label">To (UTC)</span>
          <input
            className="auditor-field__input"
            type="date"
            value={dateToUtc}
            onChange={(e) => setDateToUtc(e.target.value)}
          />
        </label>
        <label className="auditor-field">
          <span className="auditor-field__label">Tree</span>
          <input
            className="auditor-field__input"
            value={treeIndex}
            onChange={(e) => setTreeIndex(e.target.value)}
            placeholder="Optional"
            inputMode="numeric"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="auditor-form__actions">
        <button
          type="button"
          className="primary-link auditor-form__submit"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? (
            <>
              <span className="primary-link__label">Generating…</span>
              <Loader2
                aria-hidden
                className="button-arrow"
                size={16}
                style={{ animation: "spin 0.8s linear infinite" }}
              />
            </>
          ) : (
            <>
              <span className="primary-link__label">Download PDF</span>
              <FileDown aria-hidden className="button-arrow" size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
