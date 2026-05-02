"use client";

import Link from "next/link";

export function UnseenLogo({
  compact = false,
  href = "/",
}: {
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link
      aria-label="Unseen Finance home"
      className={`unseen-logo ${compact ? "unseen-logo--compact" : ""}`}
      data-cursor-hover="true"
      href={href}
    >
      <span aria-hidden="true" className="unseen-logo__mark">
        <svg fill="none" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="shieldGradient" x1="8" x2="40" y1="8" y2="40">
              <stop offset="0%" stopColor="var(--color-violet-primary)" />
              <stop offset="100%" stopColor="var(--color-violet-glow)" />
            </linearGradient>
          </defs>
          <polygon
            className="unseen-logo__shield"
            points="24,4 38,12 38,28 24,44 10,28 10,12"
            stroke="url(#shieldGradient)"
            strokeLinejoin="round"
            strokeWidth="1.75"
          />
          <path
            className="unseen-logo__eye"
            d="M14 24C17.2 18.8 20.6 16.2 24 16.2C27.4 16.2 30.8 18.8 34 24C30.8 29.2 27.4 31.8 24 31.8C20.6 31.8 17.2 29.2 14 24Z"
            stroke="url(#shieldGradient)"
            strokeWidth="1.5"
          />
          <circle
            className="unseen-logo__iris"
            cx="24"
            cy="24"
            fill="var(--color-violet-glow)"
            r="2.4"
          />
          <path
            className="unseen-logo__slash"
            d="M15.5 31L32.5 17"
            stroke="url(#shieldGradient)"
            strokeLinecap="round"
            strokeWidth="1.9"
          />
        </svg>
      </span>
      <span className="unseen-logo__type">
        <span className="unseen-logo__name">UNSEEN</span>
        <span className="unseen-logo__subline">FINANCE</span>
      </span>
    </Link>
  );
}
