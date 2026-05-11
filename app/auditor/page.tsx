import type { Metadata } from "next";
import { SiteShell } from "@/components/unseen/site-shell";
import { AuditorReportForm } from "./auditor-report-form";
import "./auditor.css";

export const metadata: Metadata = {
  title: "Auditor report",
  description: "Generate a confidential PDF from a disclosed viewing key and mint.",
};

export default function AuditorPage() {
  return (
    <SiteShell footerMode="compact">
      <main className="auditor-page">
        <div className="aurora-backdrop aurora-backdrop--subpage">
          <div className="aurora-backdrop__layer aurora-backdrop__layer--one" />
          <div className="aurora-backdrop__layer aurora-backdrop__layer--two" />
          <div className="aurora-backdrop__layer aurora-backdrop__layer--three" />
          <div className="aurora-backdrop__vignette" />
        </div>

        <header className="auditor-page__hero">
          <p className="auditor-page__eyebrow">Auditors</p>
          <h1 className="auditor-page__headline">Viewing key report</h1>
          <p className="auditor-page__subtext">
            Build a confidential PDF from a disclosed viewing key and token mint—scoped
            dates and optional Merkle tree—for offline review.
          </p>
        </header>

        <section className="auditor-page__form-wrap" aria-label="Report form">
          <AuditorReportForm />
        </section>
      </main>
    </SiteShell>
  );
}
