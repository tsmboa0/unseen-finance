"use client";

import { useState } from "react";
import {
  DPageHeader,
  DStatCard,
  DTable,
  DTabs,
  DBadge,
  DButton,
  DModal,
  DConfirm,
  DInput,
  DSelect,
  DToggle,
  DEmptyState,
} from "@/components/dashboard/primitives";
import type { TeamMember } from "@/lib/dashboard-types";
import { formatRelativeTime } from "@/components/dashboard/formatters";
import { useMerchantApi } from "@/hooks/use-merchant-api";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import {
  Settings,
  User,
  Building2,
  CreditCard,
  Shield,
  Users,
  Plus,
  Trash2,
  Check,
} from "lucide-react";

const TABS = [
  { id: "business", label: "Business" },
  { id: "profile",  label: "Profile" },
  { id: "team",     label: "Team" },
  { id: "billing",  label: "Billing" },
  { id: "security", label: "Security" },
];

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

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "GMT / London" },
  { value: "Europe/Berlin", label: "CET / Berlin" },
  { value: "Africa/Lagos", label: "WAT / Lagos" },
  { value: "Asia/Dubai", label: "GST / Dubai" },
  { value: "Asia/Singapore", label: "SGT / Singapore" },
  { value: "Asia/Tokyo", label: "JST / Tokyo" },
  { value: "Australia/Sydney", label: "AEST / Sydney" },
];

const ROLE_OPTIONS = [
  { value: "Admin", label: "Admin" },
  { value: "Developer", label: "Developer" },
  { value: "Finance", label: "Finance" },
  { value: "Viewer", label: "Viewer" },
];

const PLAN_FEATURES = [
  "Unlimited shielded transactions",
  "Up to 25 team members",
  "Priority settlement (< 500ms)",
  "Compliance reports & audit exports",
  "Dedicated account manager",
  "Custom API rate limits",
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("business");
  const { merchant, loading, updateMerchant } = useMerchantApi();
  const { data: overviewData, loading: overviewLoading } = useDashboardOverview();
  const team = overviewData?.overview.team ?? [];

  // Profile state
  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Business state
  const [orgName,      setOrgName]      = useState<string | null>(null);
  const [handle,       setHandle]       = useState<string | null>(null);
  const [businessSize, setBusinessSize] = useState<string | null>(null);
  const [industry,     setIndustry]     = useState<string | null>(null);
  const [country,      setCountry]      = useState<string | null>(null);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [saveSuccess,  setSaveSuccess]  = useState<string | null>(null);

  // Team state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Developer");
  const [inviteSending, setInviteSending] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);

  // Security state
  const [twoFA, setTwoFA] = useState(true);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // All hooks must be called before any conditional return
  if ((loading || overviewLoading) && !merchant && !overviewData) {
    return (
      <div className="d-card" style={{ minHeight: 220, display: "grid", placeItems: "center" }}>
        <div style={{ width: 28, height: 28, border: "3px solid rgba(123,47,255,0.2)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const profileNameValue  = fullName     ?? merchant?.ownerName    ?? merchant?.email ?? "";
  const emailValue        = email        ?? merchant?.email        ?? "";
  const timezoneValue     = timezone     ?? merchant?.timezone     ?? "Africa/Lagos";
  const orgNameValue      = orgName      ?? merchant?.name         ?? "";
  const handleValue       = handle       ?? merchant?.handle       ?? "";
  const businessSizeValue = businessSize ?? merchant?.businessSize ?? "";
  const industryValue     = industry     ?? merchant?.industry     ?? "";
  const countryValue      = country      ?? merchant?.country      ?? "";

  async function saveProfile() {
    setProfileSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await updateMerchant({
        ownerName: profileNameValue,
        email: emailValue,
        timezone: timezoneValue,
      });
      setFullName(null);
      setEmail(null);
      setTimezone(null);
      setSaveSuccess("Profile saved.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveBusiness() {
    setBusinessSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await updateMerchant({
        name:         orgNameValue,
        handle:       handleValue,
        businessSize: businessSizeValue || null,
        industry:     industryValue     || null,
        country:      countryValue      || null,
      });
      setOrgName(null);
      setHandle(null);
      setBusinessSize(null);
      setIndustry(null);
      setCountry(null);
      setSaveSuccess("Business settings saved.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save business settings");
    } finally {
      setBusinessSaving(false);
    }
  }

  function simulateSave(setLoading: (v: boolean) => void) {
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  }

  const teamColumns = [
    {
      key: "name",
      header: "Name",
      render: (m: TeamMember) => (
        <span style={{ fontWeight: 500 }}>{m.name}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (m: TeamMember) => m.email,
      hideOnMobile: true,
    },
    {
      key: "role",
      header: "Role",
      render: (m: TeamMember) => (
        <DBadge variant={m.role === "Owner" ? "violet" : "default"}>
          {m.role}
        </DBadge>
      ),
    },
    {
      key: "lastActive",
      header: "Last Active",
      render: (m: TeamMember) => formatRelativeTime(m.lastActiveAt),
      hideOnMobile: true,
    },
    {
      key: "twoFA",
      header: "2FA",
      align: "center" as const,
      render: (m: TeamMember) =>
        m.twoFA ? (
          <Check size={16} style={{ color: "var(--color-success, #22c55e)" }} />
        ) : (
          <span style={{ opacity: 0.35 }}>—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right" as const,
      render: (m: TeamMember) =>
        m.role !== "Owner" ? (
          <DButton
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setRemoveTarget(m)}
          >
            Remove
          </DButton>
        ) : null,
    },
  ];

  return (
    <>
      <DPageHeader
        title="Settings"
        description="Manage your account, team, and billing."
      />

      <DTabs items={TABS} active={activeTab} onChange={setActiveTab} />

      <div style={{ marginTop: "1.5rem" }}>
        {(saveError || saveSuccess) && (
          <div
            className="d-card"
            style={{
              borderColor: saveError ? "rgba(239, 68, 68, 0.35)" : "rgba(34, 197, 94, 0.35)",
              color: saveError ? "#fca5a5" : "var(--color-success)",
              marginBottom: "1rem",
              padding: "0.85rem 1rem",
            }}
          >
            {saveError ?? saveSuccess}
          </div>
        )}

        {/* ── Profile ── */}
        {activeTab === "profile" && (
          <div className="d-card" style={{ padding: "1.5rem" }}>
            <div
              style={{
                display: "grid",
                gap: "1.25rem",
                maxWidth: 480,
              }}
            >
              <DInput
                label="Full Name"
                value={profileNameValue}
                onChange={setFullName}
                icon={User}
                disabled={loading}
              />
              <DInput
                label="Email"
                value={emailValue}
                onChange={setEmail}
                type="email"
                disabled={loading}
              />
              <DSelect
                label="Timezone"
                value={timezoneValue}
                onChange={setTimezone}
                options={TIMEZONE_OPTIONS}
                disabled={loading}
              />
              <DInput
                label="Wallet Address"
                value={merchant?.walletAddress ?? "No Privy wallet connected"}
                onChange={() => {}}
                disabled
                hint="This is read from the connected Privy wallet."
              />
              <div>
                <DButton
                  loading={profileSaving}
                  onClick={saveProfile}
                  disabled={loading || !profileNameValue || !emailValue}
                >
                  Save Changes
                </DButton>
              </div>
            </div>
          </div>
        )}

        {/* ── Business ── */}
        {activeTab === "business" && (
          <div className="d-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "grid", gap: "1.25rem", maxWidth: 560 }}>
              <DInput
                label="Business Name"
                value={orgNameValue}
                onChange={setOrgName}
                icon={Building2}
                disabled={loading}
              />
              <DInput
                label="Handle"
                value={handleValue}
                onChange={setHandle}
                disabled={loading}
                hint="Your public merchant display handle."
              />
              <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "1fr 1fr" }}>
                <DSelect
                  label="Business Size"
                  value={businessSizeValue}
                  onChange={setBusinessSize}
                  options={BUSINESS_SIZE_OPTIONS}
                  disabled={loading}
                />
                <DSelect
                  label="Industry"
                  value={industryValue}
                  onChange={setIndustry}
                  options={INDUSTRY_OPTIONS}
                  disabled={loading}
                />
              </div>
              <DInput
                label="Country"
                value={countryValue}
                onChange={setCountry}
                disabled={loading}
              />
              <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
                <div className="d-field">
                  <span className="d-field__label">Plan</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      {merchant?.plan ?? "Starter"}
                    </span>
                    <DButton variant="ghost" size="sm">Change Plan</DButton>
                  </div>
                </div>
                <div className="d-field">
                  <span className="d-field__label">KYB Status</span>
                  <DBadge variant="success" dot>
                    {merchant?.kybStatus ?? "Pending"}
                  </DBadge>
                </div>
              </div>
              <div>
                <DButton
                  loading={businessSaving}
                  onClick={saveBusiness}
                  disabled={loading || !orgNameValue}
                >
                  Save Changes
                </DButton>
              </div>
            </div>
          </div>
        )}

        {/* ── Team ── */}
        {activeTab === "team" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <DButton icon={Plus} onClick={() => setInviteOpen(true)}>
                Invite Member
              </DButton>
            </div>

            <DTable columns={teamColumns} data={overviewLoading ? [] : team} />

            <DModal
              open={inviteOpen}
              onClose={() => setInviteOpen(false)}
              title="Invite Team Member"
            >
              <div style={{ display: "grid", gap: "1rem" }}>
                <DInput
                  label="Email"
                  value={inviteEmail}
                  onChange={setInviteEmail}
                  placeholder="colleague@company.xyz"
                  type="email"
                />
                <DSelect
                  label="Role"
                  value={inviteRole}
                  onChange={setInviteRole}
                  options={ROLE_OPTIONS}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <DButton
                    loading={inviteSending}
                    onClick={() => {
                      simulateSave(setInviteSending);
                      setTimeout(() => {
                        setInviteOpen(false);
                        setInviteEmail("");
                        setInviteRole("Developer");
                      }, 1200);
                    }}
                    disabled={!inviteEmail}
                  >
                    Send Invite
                  </DButton>
                </div>
              </div>
            </DModal>

            <DConfirm
              open={!!removeTarget}
              onClose={() => setRemoveTarget(null)}
              onConfirm={() => setRemoveTarget(null)}
              title="Remove Team Member"
              description={`Remove ${removeTarget?.name} (${removeTarget?.email}) from ${merchant?.name ?? "this merchant"}? They will lose access immediately.`}
              confirmLabel="Remove"
            />
          </div>
        )}

        {/* ── Billing ── */}
        {activeTab === "billing" && (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            <div className="d-card" style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                    Current Plan
                  </h3>
                  <p
                    style={{
                      margin: "0.25rem 0 0",
                      opacity: 0.6,
                      fontSize: "0.875rem",
                    }}
                  >
                    You&apos;re on the{" "}
                    <strong>{merchant?.plan ?? "Starter"}</strong> plan.
                  </p>
                </div>
                <DButton variant="ghost" size="sm">
                  Change Plan
                </DButton>
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "grid",
                  gap: "0.5rem",
                }}
              >
                {PLAN_FEATURES.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    <Check
                      size={14}
                      style={{ color: "var(--color-success, #22c55e)", flexShrink: 0 }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="d-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>
                Payment Method
              </h3>
              <DEmptyState
                icon={CreditCard}
                title="No payment method"
                description="Add a payment method to manage your subscription."
                action={
                  <DButton variant="secondary" icon={Plus}>
                    Add Payment Method
                  </DButton>
                }
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "1rem",
              }}
            >
              <DStatCard
                label="Transactions This Month"
                value="1,384"
                icon={Settings}
              />
              <DStatCard
                label="Volume This Month"
                value="$2.42M"
                icon={CreditCard}
              />
              <DStatCard
                label="Team Members"
                value={String(team.length)}
                icon={Users}
              />
            </div>
          </div>
        )}

        {/* ── Security ── */}
        {activeTab === "security" && (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            <div className="d-card" style={{ padding: "1.5rem" }}>
              <DToggle
                checked={twoFA}
                onChange={setTwoFA}
                label="Two-Factor Authentication"
                description="Require a second factor when signing in."
              />
            </div>

            <div className="d-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>
                Active Sessions
              </h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.875rem" }}>
                  1 active session —{" "}
                  <DBadge variant="success">Current</DBadge>
                </span>
                <DButton variant="ghost" size="sm">
                  Sign Out All
                </DButton>
              </div>
            </div>

            <div className="d-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>
                Password
              </h3>
              <DButton variant="ghost" onClick={() => setPasswordOpen(true)}>
                Change Password
              </DButton>

              <DModal
                open={passwordOpen}
                onClose={() => {
                  setPasswordOpen(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                title="Change Password"
              >
                <div style={{ display: "grid", gap: "1rem" }}>
                  <DInput
                    label="Current Password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    type="password"
                  />
                  <DInput
                    label="New Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    type="password"
                  />
                  <DInput
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    type="password"
                    error={
                      confirmPassword && confirmPassword !== newPassword
                        ? "Passwords do not match"
                        : undefined
                    }
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <DButton
                      loading={passwordSaving}
                      disabled={
                        !currentPassword ||
                        !newPassword ||
                        newPassword !== confirmPassword
                      }
                      onClick={() => {
                        simulateSave(setPasswordSaving);
                        setTimeout(() => {
                          setPasswordOpen(false);
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                        }, 1200);
                      }}
                    >
                      Update Password
                    </DButton>
                  </div>
                </div>
              </DModal>
            </div>

            <div className="d-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>
                API Access
              </h3>
              <p
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "0.875rem",
                  opacity: 0.6,
                }}
              >
                Manage API keys and access tokens for programmatic access.
              </p>
              <DButton
                variant="ghost"
                icon={Shield}
                onClick={() =>
                  (window.location.href = "/dashboard/api-keys")
                }
              >
                Manage API Keys
              </DButton>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
