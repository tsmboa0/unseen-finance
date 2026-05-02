"use client";

import {
  type ReactNode,
  type ChangeEvent,
  type MouseEvent,
  useState,
  useEffect,
  useId,
  useCallback,
} from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  X,
  Search,
  Inbox,
  type LucideIcon,
} from "lucide-react";

/* ─── Button ──────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export function DButton({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  onClick,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className={`d-btn d-btn--${variant} d-btn--${size} ${loading ? "d-btn--loading" : ""} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
    >
      {loading ? (
        <span className="d-btn__spinner" />
      ) : Icon ? (
        <Icon aria-hidden size={size === "sm" ? 14 : 16} />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

/* ─── Input ───────────────────────────────────────────── */

export function DInput({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  name,
  error,
  hint,
  disabled = false,
  icon: Icon,
  className = "",
  autoFocus = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  name?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  icon?: LucideIcon;
  className?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className={`d-field ${error ? "d-field--error" : ""} ${className}`}>
      {label && <label htmlFor={id} className="d-field__label">{label}</label>}
      <div className="d-field__input-wrap">
        {Icon && <Icon aria-hidden className="d-field__icon" size={16} />}
        <input
          autoFocus={autoFocus}
          className={`d-field__input ${Icon ? "d-field__input--icon" : ""}`}
          disabled={disabled}
          id={id}
          name={name}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
      </div>
      {error && <p className="d-field__error">{error}</p>}
      {hint && !error && <p className="d-field__hint">{hint}</p>}
    </div>
  );
}

/* ─── Textarea ────────────────────────────────────────── */

export function DTextarea({
  label,
  value,
  onChange,
  placeholder = "",
  rows = 3,
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`d-field ${className}`}>
      {label && <label htmlFor={id} className="d-field__label">{label}</label>}
      <textarea
        className="d-field__textarea"
        id={id}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </div>
  );
}

/* ─── Select ──────────────────────────────────────────── */

export function DSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  className = "",
  disabled = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={`d-field ${className}`}>
      {label && <label htmlFor={id} className="d-field__label">{label}</label>}
      <div className="d-field__select-wrap">
        <select
          className="d-field__select"
          disabled={disabled}
          id={id}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
          value={value}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown aria-hidden className="d-field__chevron" size={16} />
      </div>
    </div>
  );
}

/* ─── Toggle ──────────────────────────────────────────── */

export function DToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  description?: string;
}) {
  return (
    <label className="d-toggle">
      <div>
        {label && <span className="d-toggle__label">{label}</span>}
        {description && <span className="d-toggle__desc">{description}</span>}
      </div>
      <button
        aria-checked={checked}
        className={`d-toggle__track ${checked ? "is-on" : ""}`}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span className="d-toggle__thumb" />
      </button>
    </label>
  );
}

/* ─── Badge ───────────────────────────────────────────── */

type BadgeVariant = "default" | "success" | "warning" | "error" | "violet" | "muted";

export function DBadge({
  children,
  variant = "default",
  dot = false,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
}) {
  return (
    <span className={`d-badge d-badge--${variant}`}>
      {dot && <span className="d-badge__dot" />}
      {children}
    </span>
  );
}

/* ─── Tabs ────────────────────────────────────────────── */

type TabItem = { id: string; label: string; count?: number };

export function DTabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="d-tabs" role="tablist">
      {items.map((tab) => (
        <button
          aria-selected={tab.id === active}
          className={`d-tabs__tab ${tab.id === active ? "is-active" : ""}`}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
          {tab.count !== undefined && <span className="d-tabs__count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ─── Modal ───────────────────────────────────────────── */

export function DModal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="d-modal-backdrop" onClick={onClose}>
      <div
        className={`d-modal ${wide ? "d-modal--wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div className="d-modal__header">
          <h3>{title}</h3>
          <button className="d-modal__close" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="d-modal__body">{children}</div>
      </div>
    </div>
  );
}

/* ─── Drawer ──────────────────────────────────────────── */

export function DDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="d-drawer-backdrop" onClick={onClose}>
      <div className="d-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="d-drawer__header">
          <h3>{title}</h3>
          <button className="d-drawer__close" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="d-drawer__body">{children}</div>
      </div>
    </div>
  );
}

/* ─── CopyField ───────────────────────────────────────── */

export function DCopyField({
  value,
  label,
  masked = false,
}: {
  value: string;
  label?: string;
  masked?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!masked);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <div className="d-copy-field">
      {label && <span className="d-copy-field__label">{label}</span>}
      <div className="d-copy-field__row">
        <code className="d-copy-field__value">
          {revealed ? value : "•".repeat(Math.min(value.length, 32))}
        </code>
        {masked && (
          <button className="d-copy-field__btn" onClick={() => setRevealed(!revealed)} type="button" aria-label={revealed ? "Hide" : "Reveal"}>
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        <button className="d-copy-field__btn" onClick={handleCopy} type="button" aria-label="Copy">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

/* ─── EmptyState ──────────────────────────────────────── */

export function DEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="d-empty">
      <Icon aria-hidden className="d-empty__icon" size={40} />
      <h4 className="d-empty__title">{title}</h4>
      {description && <p className="d-empty__desc">{description}</p>}
      {action && <div className="d-empty__action">{action}</div>}
    </div>
  );
}

/* ─── PageHeader ──────────────────────────────────────── */

export function DPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="d-page-header">
      <div>
        <h1 className="d-page-header__title">{title}</h1>
        {description && <p className="d-page-header__desc">{description}</p>}
      </div>
      {actions && <div className="d-page-header__actions">{actions}</div>}
    </div>
  );
}

/* ─── StatCard ────────────────────────────────────────── */

export function DStatCard({
  label,
  value,
  delta,
  icon: Icon,
  sparkline,
}: {
  label: string;
  value: string;
  delta?: { label: string; isPositive: boolean; isZero: boolean };
  icon?: LucideIcon;
  sparkline?: ReactNode;
}) {
  return (
    <div className="d-stat">
      <div className="d-stat__top">
        {Icon && <Icon aria-hidden className="d-stat__icon" size={18} />}
        <span className="d-stat__label">{label}</span>
      </div>
      <div className="d-stat__value">{value}</div>
      <div className="d-stat__bottom">
        {delta && (
          <span className={`d-stat__delta ${delta.isPositive ? "d-stat__delta--up" : delta.isZero ? "" : "d-stat__delta--down"}`}>
            {delta.label}
          </span>
        )}
        {sparkline}
      </div>
    </div>
  );
}

/* ─── FilterBar ───────────────────────────────────────── */

export function DFilterBar({
  search,
  onSearch,
  searchPlaceholder = "Search…",
  children,
}: {
  search?: string;
  onSearch?: (val: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="d-filter-bar">
      {onSearch !== undefined && (
        <div className="d-filter-bar__search">
          <Search aria-hidden size={15} />
          <input
            className="d-filter-bar__input"
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            type="text"
            value={search ?? ""}
          />
        </div>
      )}
      {children && <div className="d-filter-bar__controls">{children}</div>}
    </div>
  );
}

/* ─── DataTable ───────────────────────────────────────── */

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  hideOnMobile?: boolean;
};

export function DTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyTitle = "No data",
  emptyDescription,
}: {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (data.length === 0) {
    return <DEmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="d-table-wrap">
      <table className="d-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                className={`${col.hideOnMobile ? "d-table__hide-mobile" : ""}`}
                key={col.key}
                style={{ textAlign: col.align ?? "left", width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              className={onRowClick ? "d-table__row--clickable" : ""}
              key={row.id}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  className={`${col.hideOnMobile ? "d-table__hide-mobile" : ""}`}
                  key={col.key}
                  style={{ textAlign: col.align ?? "left" }}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Confirm Dialog ──────────────────────────────────── */

export function DConfirm({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <DModal open onClose={onClose} title={title}>
      <p className="d-confirm__desc">{description}</p>
      <div className="d-confirm__actions">
        <DButton variant="ghost" onClick={onClose}>Cancel</DButton>
        <DButton variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</DButton>
      </div>
    </DModal>
  );
}

/* ─── Stepper ─────────────────────────────────────────── */

export function DStepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="d-stepper">
      {steps.map((step, i) => (
        <div
          className={`d-stepper__step ${i < current ? "is-complete" : i === current ? "is-active" : ""}`}
          key={step}
        >
          <span className="d-stepper__dot">{i < current ? <Check size={12} /> : i + 1}</span>
          <span className="d-stepper__label">{step}</span>
          {i < steps.length - 1 && <span className="d-stepper__line" />}
        </div>
      ))}
    </div>
  );
}

/* ─── MultiSelect Tags ────────────────────────────────── */

export function DTagSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label?: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };
  return (
    <div className="d-tag-select">
      {label && <span className="d-field__label">{label}</span>}
      <div className="d-tag-select__list">
        {options.map((o) => (
          <button
            className={`d-tag-select__tag ${selected.includes(o.value) ? "is-selected" : ""}`}
            key={o.value}
            onClick={() => toggle(o.value)}
            type="button"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Checkbox ────────────────────────────────────────── */

export function DCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <label className="d-checkbox">
      <span className={`d-checkbox__box ${checked ? "is-checked" : ""}`}>
        {checked && <Check size={12} />}
      </span>
      <span className="d-checkbox__label">{label}</span>
      <input
        checked={checked}
        className="d-checkbox__input"
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
