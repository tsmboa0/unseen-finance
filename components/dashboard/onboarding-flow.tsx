"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowRight, Building2, CheckCircle2, ChevronDown, Loader2, Search, UserRound } from "lucide-react";
import { useMerchantApi } from "@/hooks/use-merchant-api";

// ── Searchable country combobox ───────────────────────────────────────────────

function CountryCombobox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const wrapRef               = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);
  const listRef               = useRef<HTMLUListElement>(null);
  const [focused, setFocused] = useState(false);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().startsWith(query.toLowerCase()))
    : options;

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Keyboard: Escape closes, arrow keys move highlight
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); setQuery(""); }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll("li[data-option]");
      (items?.[0] as HTMLElement | undefined)?.focus();
    }
  }

  function onOptionKey(e: React.KeyboardEvent<HTMLLIElement>, optValue: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(optValue);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
      if (prev) prev.focus(); else inputRef.current?.focus();
    }
    if (e.key === "Escape") { setOpen(false); setQuery(""); }
  }

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  const triggerBorder = focused
    ? "var(--color-violet-border-hover)"
    : "var(--color-violet-border)";
  const triggerShadow = focused
    ? "0 0 0 3px var(--color-violet-shimmer)"
    : "none";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          ...styles.input,
          alignItems: "center",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          borderColor: triggerBorder,
          boxShadow: triggerShadow,
          textAlign: "left",
        }}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setTimeout(() => inputRef.current?.focus(), 40);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <span style={{ color: value ? "var(--color-text-primary)" : "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLabel || "Select country"}
        </span>
        <ChevronDown
          size={15}
          aria-hidden
          style={{
            color: "var(--color-text-muted)",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.18s ease",
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={styles.comboDropdown}>
          {/* Search input */}
          <div style={styles.comboSearchWrap}>
            <Search size={13} aria-hidden style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search country…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              style={styles.comboSearch}
              aria-label="Search countries"
            />
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            role="listbox"
            aria-label="Countries"
            style={styles.comboList}
          >
            {filtered.length === 0 ? (
              <li style={styles.comboEmpty}>No results</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={o.value === value}
                  data-option
                  tabIndex={0}
                  style={{
                    ...styles.comboOption,
                    ...(o.value === value ? styles.comboOptionActive : {}),
                  }}
                  onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
                  onKeyDown={(e) => onOptionKey(e, o.value)}
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const BUSINESS_SIZE_OPTIONS = [
  { value: "solo",        label: "Solo (just me)" },
  { value: "small",       label: "2 – 10 employees" },
  { value: "growth",      label: "11 – 50 employees" },
  { value: "mid-market",  label: "51 – 200 employees" },
  { value: "enterprise",  label: "200+ employees" },
];

const INDUSTRY_OPTIONS = [
  { value: "ecommerce",  label: "E-commerce" },
  { value: "saas",       label: "SaaS / Software" },
  { value: "agency",     label: "Agency / Services" },
  { value: "creator",    label: "Creator / Community" },
  { value: "education",  label: "Education" },
  { value: "other",      label: "Other" },
];

const COUNTRY_OPTIONS = [
  { value: "Afghanistan",                              label: "Afghanistan" },
  { value: "Albania",                                  label: "Albania" },
  { value: "Algeria",                                  label: "Algeria" },
  { value: "Andorra",                                  label: "Andorra" },
  { value: "Angola",                                   label: "Angola" },
  { value: "Antigua and Barbuda",                      label: "Antigua and Barbuda" },
  { value: "Argentina",                                label: "Argentina" },
  { value: "Armenia",                                  label: "Armenia" },
  { value: "Australia",                                label: "Australia" },
  { value: "Austria",                                  label: "Austria" },
  { value: "Azerbaijan",                               label: "Azerbaijan" },
  { value: "Bahamas",                                  label: "Bahamas" },
  { value: "Bahrain",                                  label: "Bahrain" },
  { value: "Bangladesh",                               label: "Bangladesh" },
  { value: "Barbados",                                 label: "Barbados" },
  { value: "Belarus",                                  label: "Belarus" },
  { value: "Belgium",                                  label: "Belgium" },
  { value: "Belize",                                   label: "Belize" },
  { value: "Benin",                                    label: "Benin" },
  { value: "Bhutan",                                   label: "Bhutan" },
  { value: "Bolivia",                                  label: "Bolivia" },
  { value: "Bosnia and Herzegovina",                   label: "Bosnia and Herzegovina" },
  { value: "Botswana",                                 label: "Botswana" },
  { value: "Brazil",                                   label: "Brazil" },
  { value: "Brunei",                                   label: "Brunei" },
  { value: "Bulgaria",                                 label: "Bulgaria" },
  { value: "Burkina Faso",                             label: "Burkina Faso" },
  { value: "Burundi",                                  label: "Burundi" },
  { value: "Cabo Verde",                               label: "Cabo Verde" },
  { value: "Cambodia",                                 label: "Cambodia" },
  { value: "Cameroon",                                 label: "Cameroon" },
  { value: "Canada",                                   label: "Canada" },
  { value: "Central African Republic",                 label: "Central African Republic" },
  { value: "Chad",                                     label: "Chad" },
  { value: "Chile",                                    label: "Chile" },
  { value: "China",                                    label: "China" },
  { value: "Colombia",                                 label: "Colombia" },
  { value: "Comoros",                                  label: "Comoros" },
  { value: "Congo (Brazzaville)",                      label: "Congo (Brazzaville)" },
  { value: "Congo (Kinshasa)",                         label: "Congo (Kinshasa)" },
  { value: "Costa Rica",                               label: "Costa Rica" },
  { value: "Croatia",                                  label: "Croatia" },
  { value: "Cuba",                                     label: "Cuba" },
  { value: "Cyprus",                                   label: "Cyprus" },
  { value: "Czech Republic",                           label: "Czech Republic" },
  { value: "Denmark",                                  label: "Denmark" },
  { value: "Djibouti",                                 label: "Djibouti" },
  { value: "Dominica",                                 label: "Dominica" },
  { value: "Dominican Republic",                       label: "Dominican Republic" },
  { value: "Ecuador",                                  label: "Ecuador" },
  { value: "Egypt",                                    label: "Egypt" },
  { value: "El Salvador",                              label: "El Salvador" },
  { value: "Equatorial Guinea",                        label: "Equatorial Guinea" },
  { value: "Eritrea",                                  label: "Eritrea" },
  { value: "Estonia",                                  label: "Estonia" },
  { value: "Eswatini",                                 label: "Eswatini" },
  { value: "Ethiopia",                                 label: "Ethiopia" },
  { value: "Fiji",                                     label: "Fiji" },
  { value: "Finland",                                  label: "Finland" },
  { value: "France",                                   label: "France" },
  { value: "Gabon",                                    label: "Gabon" },
  { value: "Gambia",                                   label: "Gambia" },
  { value: "Georgia",                                  label: "Georgia" },
  { value: "Germany",                                  label: "Germany" },
  { value: "Ghana",                                    label: "Ghana" },
  { value: "Greece",                                   label: "Greece" },
  { value: "Grenada",                                  label: "Grenada" },
  { value: "Guatemala",                                label: "Guatemala" },
  { value: "Guinea",                                   label: "Guinea" },
  { value: "Guinea-Bissau",                            label: "Guinea-Bissau" },
  { value: "Guyana",                                   label: "Guyana" },
  { value: "Haiti",                                    label: "Haiti" },
  { value: "Honduras",                                 label: "Honduras" },
  { value: "Hungary",                                  label: "Hungary" },
  { value: "Iceland",                                  label: "Iceland" },
  { value: "India",                                    label: "India" },
  { value: "Indonesia",                                label: "Indonesia" },
  { value: "Iran",                                     label: "Iran" },
  { value: "Iraq",                                     label: "Iraq" },
  { value: "Ireland",                                  label: "Ireland" },
  { value: "Israel",                                   label: "Israel" },
  { value: "Italy",                                    label: "Italy" },
  { value: "Ivory Coast",                              label: "Ivory Coast" },
  { value: "Jamaica",                                  label: "Jamaica" },
  { value: "Japan",                                    label: "Japan" },
  { value: "Jordan",                                   label: "Jordan" },
  { value: "Kazakhstan",                               label: "Kazakhstan" },
  { value: "Kenya",                                    label: "Kenya" },
  { value: "Kiribati",                                 label: "Kiribati" },
  { value: "Kuwait",                                   label: "Kuwait" },
  { value: "Kyrgyzstan",                               label: "Kyrgyzstan" },
  { value: "Laos",                                     label: "Laos" },
  { value: "Latvia",                                   label: "Latvia" },
  { value: "Lebanon",                                  label: "Lebanon" },
  { value: "Lesotho",                                  label: "Lesotho" },
  { value: "Liberia",                                  label: "Liberia" },
  { value: "Libya",                                    label: "Libya" },
  { value: "Liechtenstein",                            label: "Liechtenstein" },
  { value: "Lithuania",                                label: "Lithuania" },
  { value: "Luxembourg",                               label: "Luxembourg" },
  { value: "Madagascar",                               label: "Madagascar" },
  { value: "Malawi",                                   label: "Malawi" },
  { value: "Malaysia",                                 label: "Malaysia" },
  { value: "Maldives",                                 label: "Maldives" },
  { value: "Mali",                                     label: "Mali" },
  { value: "Malta",                                    label: "Malta" },
  { value: "Marshall Islands",                         label: "Marshall Islands" },
  { value: "Mauritania",                               label: "Mauritania" },
  { value: "Mauritius",                                label: "Mauritius" },
  { value: "Mexico",                                   label: "Mexico" },
  { value: "Micronesia",                               label: "Micronesia" },
  { value: "Moldova",                                  label: "Moldova" },
  { value: "Monaco",                                   label: "Monaco" },
  { value: "Mongolia",                                 label: "Mongolia" },
  { value: "Montenegro",                               label: "Montenegro" },
  { value: "Morocco",                                  label: "Morocco" },
  { value: "Mozambique",                               label: "Mozambique" },
  { value: "Myanmar",                                  label: "Myanmar" },
  { value: "Namibia",                                  label: "Namibia" },
  { value: "Nauru",                                    label: "Nauru" },
  { value: "Nepal",                                    label: "Nepal" },
  { value: "Netherlands",                              label: "Netherlands" },
  { value: "New Zealand",                              label: "New Zealand" },
  { value: "Nicaragua",                                label: "Nicaragua" },
  { value: "Niger",                                    label: "Niger" },
  { value: "Nigeria",                                  label: "Nigeria" },
  { value: "North Korea",                              label: "North Korea" },
  { value: "North Macedonia",                          label: "North Macedonia" },
  { value: "Norway",                                   label: "Norway" },
  { value: "Oman",                                     label: "Oman" },
  { value: "Pakistan",                                 label: "Pakistan" },
  { value: "Palau",                                    label: "Palau" },
  { value: "Palestine",                                label: "Palestine" },
  { value: "Panama",                                   label: "Panama" },
  { value: "Papua New Guinea",                         label: "Papua New Guinea" },
  { value: "Paraguay",                                 label: "Paraguay" },
  { value: "Peru",                                     label: "Peru" },
  { value: "Philippines",                              label: "Philippines" },
  { value: "Poland",                                   label: "Poland" },
  { value: "Portugal",                                 label: "Portugal" },
  { value: "Qatar",                                    label: "Qatar" },
  { value: "Romania",                                  label: "Romania" },
  { value: "Russia",                                   label: "Russia" },
  { value: "Rwanda",                                   label: "Rwanda" },
  { value: "Saint Kitts and Nevis",                    label: "Saint Kitts and Nevis" },
  { value: "Saint Lucia",                              label: "Saint Lucia" },
  { value: "Saint Vincent and the Grenadines",         label: "Saint Vincent and the Grenadines" },
  { value: "Samoa",                                    label: "Samoa" },
  { value: "San Marino",                               label: "San Marino" },
  { value: "Sao Tome and Principe",                    label: "Sao Tome and Principe" },
  { value: "Saudi Arabia",                             label: "Saudi Arabia" },
  { value: "Senegal",                                  label: "Senegal" },
  { value: "Serbia",                                   label: "Serbia" },
  { value: "Seychelles",                               label: "Seychelles" },
  { value: "Sierra Leone",                             label: "Sierra Leone" },
  { value: "Singapore",                                label: "Singapore" },
  { value: "Slovakia",                                 label: "Slovakia" },
  { value: "Slovenia",                                 label: "Slovenia" },
  { value: "Solomon Islands",                          label: "Solomon Islands" },
  { value: "Somalia",                                  label: "Somalia" },
  { value: "South Africa",                             label: "South Africa" },
  { value: "South Korea",                              label: "South Korea" },
  { value: "South Sudan",                              label: "South Sudan" },
  { value: "Spain",                                    label: "Spain" },
  { value: "Sri Lanka",                                label: "Sri Lanka" },
  { value: "Sudan",                                    label: "Sudan" },
  { value: "Suriname",                                 label: "Suriname" },
  { value: "Sweden",                                   label: "Sweden" },
  { value: "Switzerland",                              label: "Switzerland" },
  { value: "Syria",                                    label: "Syria" },
  { value: "Taiwan",                                   label: "Taiwan" },
  { value: "Tajikistan",                               label: "Tajikistan" },
  { value: "Tanzania",                                 label: "Tanzania" },
  { value: "Thailand",                                 label: "Thailand" },
  { value: "Timor-Leste",                              label: "Timor-Leste" },
  { value: "Togo",                                     label: "Togo" },
  { value: "Tonga",                                    label: "Tonga" },
  { value: "Trinidad and Tobago",                      label: "Trinidad and Tobago" },
  { value: "Tunisia",                                  label: "Tunisia" },
  { value: "Turkey",                                   label: "Turkey" },
  { value: "Turkmenistan",                             label: "Turkmenistan" },
  { value: "Tuvalu",                                   label: "Tuvalu" },
  { value: "Uganda",                                   label: "Uganda" },
  { value: "Ukraine",                                  label: "Ukraine" },
  { value: "United Arab Emirates",                     label: "United Arab Emirates" },
  { value: "United Kingdom",                           label: "United Kingdom" },
  { value: "United States",                            label: "United States" },
  { value: "Uruguay",                                  label: "Uruguay" },
  { value: "Uzbekistan",                               label: "Uzbekistan" },
  { value: "Vanuatu",                                  label: "Vanuatu" },
  { value: "Vatican City",                             label: "Vatican City" },
  { value: "Venezuela",                                label: "Venezuela" },
  { value: "Vietnam",                                  label: "Vietnam" },
  { value: "Yemen",                                    label: "Yemen" },
  { value: "Zambia",                                   label: "Zambia" },
  { value: "Zimbabwe",                                 label: "Zimbabwe" },
];

const TIMEZONE_OPTIONS = [
  { value: "Africa/Lagos",       label: "WAT (Lagos)" },
  { value: "Europe/London",      label: "GMT (London)" },
  { value: "America/New_York",   label: "ET (New York)" },
  { value: "America/Los_Angeles",label: "PT (Los Angeles)" },
  { value: "Asia/Singapore",     label: "SGT (Singapore)" },
];

export function OnboardingFlow() {
  const { merchant, isNewUser, loading: merchantLoading, refreshMerchant } = useMerchantApi();
  const { user, getAccessToken } = usePrivy();

  // SSR-safe mount detection — no setState-in-effect needed
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controlled field state — source of truth for inputs
  const [businessName, setBusinessName] = useState("");
  const [businessSize, setBusinessSize] = useState("");
  const [industry,     setIndustry]     = useState("");
  const [country,      setCountry]      = useState("");
  const [ownerName,    setOwnerName]    = useState("");
  const [email,        setEmail]        = useState("");
  const [timezone,     setTimezone]     = useState("Africa/Lagos");

  // Initialize fields ONCE from existing merchant / Privy user data.
  // The ref guard prevents overwriting what the user has already typed.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || merchantLoading) return;
    initialized.current = true;

    if (merchant?.name)         setBusinessName(merchant.name);
    if (merchant?.businessSize) setBusinessSize(merchant.businessSize);
    if (merchant?.industry)     setIndustry(merchant.industry);
    if (merchant?.country)      setCountry(merchant.country);
    if (merchant?.ownerName)    setOwnerName(merchant.ownerName);
    if (merchant?.timezone)     setTimezone(merchant.timezone);

    const derivedEmail =
      merchant?.email ??
      user?.email?.address ??
      (user?.google as { email?: string } | undefined)?.email ??
      "";
    if (derivedEmail) setEmail(derivedEmail);
  }, [merchantLoading, merchant, user]);

  // Only show once loading is done and the user actually needs onboarding.
  // Never show during loading — that causes the "Setting up your account" spinner
  // to fire on every refresh, even for fully onboarded users.
  const shouldShowOverlay =
    !merchantLoading &&
    (isNewUser || (merchant !== null && merchant.onboardingCompletedAt === null));

  if (!mounted || !shouldShowOverlay) return null;

  const canContinueBasics =
    businessName.trim().length >= 2 &&
    businessSize.trim().length > 0 &&
    industry.trim().length > 0;

  const canFinish =
    country.trim().length > 0 &&
    ownerName.trim().length >= 2 &&
    email.includes("@") &&
    timezone.trim().length > 0;

  async function completeOnboarding() {
    setSaving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch("/api/dashboard/onboarding", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessName, businessSize, industry, country, ownerName, email, timezone }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Unable to complete onboarding (HTTP ${res.status})`);
      }

      await refreshMerchant();
      window.dispatchEvent(new Event("dashboard:refresh"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to complete onboarding");
    } finally {
      setSaving(false);
    }
  }

  function focusInput(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "var(--color-violet-border-hover)";
    e.currentTarget.style.boxShadow   = "0 0 0 3px var(--color-violet-shimmer)";
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "var(--color-violet-border)";
    e.currentTarget.style.boxShadow   = "none";
  }

  const content = (
    <div style={styles.overlay} role="dialog" aria-modal aria-labelledby="onboarding-title">
      <div style={styles.modal}>
        <>
          {/* Step progress pills */}
            <div style={styles.progressRow} aria-hidden>
              <div style={{ ...styles.pill, ...(step >= 0 ? styles.pillActive : {}) }} />
              <div style={{ ...styles.pill, ...(step >= 1 ? styles.pillActive : {}) }} />
            </div>

            {step === 0 ? (
              <>
                <div style={styles.head}>
                  <span style={styles.iconBox}><Building2 size={18} aria-hidden /></span>
                  <div>
                    <h2 id="onboarding-title" style={styles.headTitle}>Set up your business</h2>
                    <p style={styles.headSub}>A couple of quick questions to personalise your dashboard.</p>
                  </div>
                </div>

                <div style={styles.fieldCol}>
                  <label style={styles.field}>
                    <span style={styles.label}>Business name</span>
                    <input
                      style={styles.input}
                      autoComplete="organization"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Unseen Labs"
                      onFocus={focusInput}
                      onBlur={blurInput}
                    />
                  </label>

                  <div style={styles.row2}>
                    <label style={styles.field}>
                      <span style={styles.label}>Business size</span>
                      <select
                        style={styles.input}
                        value={businessSize}
                        onChange={(e) => setBusinessSize(e.target.value)}
                        onFocus={focusInput}
                        onBlur={blurInput}
                      >
                        <option value="">Select size</option>
                        {BUSINESS_SIZE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </label>

                    <label style={styles.field}>
                      <span style={styles.label}>Business type</span>
                      <select
                        style={styles.input}
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        onFocus={focusInput}
                        onBlur={blurInput}
                      >
                        <option value="">Select type</option>
                        {INDUSTRY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button
                    type="button"
                    style={{ ...styles.btnPrimary, ...(canContinueBasics ? {} : styles.btnDisabled) }}
                    disabled={!canContinueBasics}
                    onClick={() => setStep(1)}
                  >
                    Continue
                    <ArrowRight size={16} aria-hidden />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={styles.head}>
                  <span style={styles.iconBox}><UserRound size={18} aria-hidden /></span>
                  <div>
                    <h2 id="onboarding-title" style={styles.headTitle}>Contact details</h2>
                    <p style={styles.headSub}>For receipts, alerts, and compliance updates.</p>
                  </div>
                </div>

                <div style={styles.fieldCol}>
                  <div style={styles.row2}>
                    <label style={styles.field}>
                      <span style={styles.label}>Your full name</span>
                      <input
                        style={styles.input}
                        autoComplete="name"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Jane Doe"
                        onFocus={focusInput}
                        onBlur={blurInput}
                      />
                    </label>

                    <label style={styles.field}>
                      <span style={styles.label}>Business email</span>
                      <input
                        style={styles.input}
                        autoComplete="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="team@unseen.finance"
                        onFocus={focusInput}
                        onBlur={blurInput}
                      />
                    </label>
                  </div>

                  <div style={styles.row2}>
                    <label style={styles.field}>
                      <span style={styles.label}>Country</span>
                      <CountryCombobox
                        value={country}
                        onChange={setCountry}
                        options={COUNTRY_OPTIONS}
                      />
                    </label>

                    <label style={styles.field}>
                      <span style={styles.label}>Timezone</span>
                      <select
                        style={styles.input}
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        onFocus={focusInput}
                        onBlur={blurInput}
                      >
                        {TIMEZONE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                {error ? <p style={styles.errorText}>{error}</p> : null}

                <div style={styles.actions}>
                  <button
                    type="button"
                    style={{ ...styles.btnGhost, ...(saving ? styles.btnDisabled : {}) }}
                    disabled={saving}
                    onClick={() => { setError(null); setStep(0); }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.btnPrimary, ...((saving || !canFinish) ? styles.btnDisabled : {}) }}
                    disabled={saving || !canFinish}
                    onClick={completeOnboarding}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={15} aria-hidden style={{ animation: "unseen-spin 0.8s linear infinite" }} />
                        Saving…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} aria-hidden />
                        Finish setup
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </>
      </div>

      <style>{`
        @keyframes unseen-spin { to { transform: rotate(360deg); } }
        @keyframes unseen-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}

// ── Inline styles using design-system CSS variables so they respect the theme ──

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 2000001,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background: "var(--color-overlay)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },
  modal: {
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-violet-border)",
    borderRadius: "20px",
    boxShadow: "var(--shadow-card)",
    maxWidth: "520px",
    padding: "28px 26px 24px",
    width: "100%",
  },
  loadingWrap: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    padding: "24px 0",
  },
  logoMark: {
    display: "flex",
  },
  loadingTitle: {
    color: "var(--color-text-secondary)",
    fontSize: "0.95rem",
    fontWeight: 500,
    margin: 0,
  },
  loadingDots: {
    display: "flex",
    gap: "6px",
  },
  dot: {
    animation: "unseen-dot-bounce 1.2s ease-in-out infinite",
    background: "var(--color-violet-primary)",
    borderRadius: "50%",
    display: "block",
    height: "7px",
    width: "7px",
  },
  progressRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
  },
  pill: {
    background: "var(--color-violet-shimmer)",
    borderRadius: "999px",
    flex: 1,
    height: "5px",
    transition: "background 0.25s ease",
  },
  pillActive: {
    background: "var(--color-violet-primary)",
  },
  head: {
    alignItems: "center",
    display: "flex",
    gap: "12px",
    marginBottom: "18px",
  },
  iconBox: {
    alignItems: "center",
    background: "var(--color-violet-shimmer)",
    border: "1px solid var(--color-violet-border)",
    borderRadius: "12px",
    color: "var(--color-violet-glow)",
    display: "inline-flex",
    flexShrink: 0,
    height: "38px",
    justifyContent: "center",
    width: "38px",
  },
  headTitle: {
    color: "var(--color-text-primary)",
    fontSize: "1.1rem",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    lineHeight: 1.25,
    margin: 0,
  },
  headSub: {
    color: "var(--color-text-muted)",
    fontSize: "0.87rem",
    margin: "3px 0 0",
  },
  fieldCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  row2: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "1fr 1fr",
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    color: "var(--color-text-secondary)",
    fontSize: "0.8rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
  input: {
    background: "var(--color-violet-shimmer)",
    border: "1px solid var(--color-violet-border)",
    borderRadius: "10px",
    color: "var(--color-text-primary)",
    fontSize: "0.93rem",
    fontFamily: "inherit",
    minHeight: "44px",
    outline: "none",
    padding: "0 12px",
    transition: "border-color 0.15s, box-shadow 0.15s",
    width: "100%",
  },
  actions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    marginTop: "20px",
  },
  btnPrimary: {
    alignItems: "center",
    background: "var(--gradient-violet)",
    border: "0",
    borderRadius: "10px",
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: "0.88rem",
    fontWeight: 600,
    fontFamily: "inherit",
    gap: "7px",
    justifyContent: "center",
    minHeight: "40px",
    minWidth: "120px",
    padding: "0 16px",
  },
  btnGhost: {
    alignItems: "center",
    background: "transparent",
    border: "1px solid var(--color-violet-border)",
    borderRadius: "10px",
    color: "var(--color-text-secondary)",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: "0.88rem",
    fontWeight: 600,
    fontFamily: "inherit",
    gap: "7px",
    justifyContent: "center",
    minHeight: "40px",
    minWidth: "80px",
    padding: "0 16px",
  },
  btnDisabled: {
    cursor: "not-allowed",
    opacity: 0.5,
  },
  errorText: {
    color: "var(--color-terminal-red)",
    fontSize: "0.84rem",
    marginTop: "12px",
  },
  comboDropdown: {
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-violet-border)",
    borderRadius: "12px",
    boxShadow: "var(--shadow-card)",
    left: 0,
    marginTop: "4px",
    overflow: "hidden",
    position: "absolute" as const,
    right: 0,
    top: "100%",
    zIndex: 10,
  },
  comboSearchWrap: {
    alignItems: "center",
    borderBottom: "1px solid var(--color-line-soft)",
    display: "flex",
    gap: "8px",
    padding: "8px 10px",
  },
  comboSearch: {
    background: "transparent",
    border: "none",
    color: "var(--color-text-primary)",
    flex: 1,
    fontSize: "0.85rem",
    fontFamily: "inherit",
    outline: "none",
  },
  comboList: {
    listStyle: "none",
    maxHeight: "200px",
    overflowY: "auto" as const,
    padding: "4px",
  },
  comboOption: {
    borderRadius: "8px",
    color: "var(--color-text-primary)",
    cursor: "pointer",
    fontSize: "0.88rem",
    outline: "none",
    padding: "8px 10px",
    transition: "background 0.1s",
  },
  comboOptionActive: {
    background: "var(--color-violet-shimmer)",
    color: "var(--color-violet-glow)",
    fontWeight: 600,
  },
  comboEmpty: {
    color: "var(--color-text-muted)",
    fontSize: "0.85rem",
    padding: "10px",
    textAlign: "center" as const,
  },
} as const;
