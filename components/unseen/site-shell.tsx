"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type LucideIcon,
  Activity,
  ArrowRight,
  Briefcase,
  Building2,
  ChevronDown,
  CircleDollarSign,
  Code2,
  Command,
  ExternalLink,
  FileCheck2,
  Gift,
  Landmark,
  Menu,
  Shield,
  Store,
  X,
  Zap,
} from "lucide-react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "framer-motion";
import {
  IconBrandDiscord,
  IconBrandGithub,
  IconBrandTelegram,
  IconBrandX,
} from "@/components/unseen/social-brand-icons";
import { SOCIAL_URL_TELEGRAM, SOCIAL_URL_X } from "@/lib/social-urls";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { UnseenLogo } from "@/components/unseen/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { pageLinks } from "@/components/unseen/site-content";
import { UNSEEN_DOCS_URL } from "@/lib/docs-url";
import {
  BetaLoginGateProvider,
  useBetaPendingRedirectRef,
} from "@/components/beta/beta-login-gate-provider";

type MenuItem = {
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
};

const productMenu: MenuItem[] = [
  {
    title: "Unseen Gateway",
    description: "Privacy-native payment acceptance",
    href: "/products/gateway",
    icon: Shield,
  },
  {
    title: "Unseen Payroll",
    description: "Confidential team compensation",
    href: "/products/payroll",
    icon: Briefcase,
  },
  {
    title: "Unseen x402",
    description: "API monetization with on-chain paywalls",
    href: "/products/x402",
    icon: Zap,
  },
  {
    title: "Unseen Storefronts",
    description: "Privacy-native e-commerce",
    href: "/products/storefronts",
    icon: Store,
  },
  {
    title: "Tiplinks & Gift Cards",
    description: "Anonymous value transfer",
    href: "/products/tiplinks",
    icon: Gift,
  },
  {
    title: "Unseen Compliance",
    description: "Authorized disclosure for regulators & partners",
    href: "/products/compliance",
    icon: FileCheck2,
  },
];

const solutionMenu: MenuItem[] = [
  {
    title: "For Merchants",
    description: "Accept private payments at scale",
    href: "/products/gateway",
    icon: Store,
  },
  {
    title: "For Enterprises",
    description: "Institutional-grade privacy rails",
    href: "/auditor",
    icon: Building2,
  },
  {
    title: "For Developers",
    description: "SDK, APIs, and developer tools",
    href: UNSEEN_DOCS_URL,
    icon: Code2,
  },
  {
    title: "For DAOs",
    description: "On-chain treasury management",
    href: "/products/payroll",
    icon: Landmark,
  },
];

const companyLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/pricing", label: "About" },
  { href: "/pricing", label: "Blog" },
  { href: "/pricing", label: "Careers" },
  { href: "/pricing", label: "Press Kit" },
  { href: "/pricing", label: "Brand Assets" },
] as const;

const developerLinks = [
  { href: UNSEEN_DOCS_URL, label: "Documentation", external: true },
  { href: UNSEEN_DOCS_URL, label: "SDK Reference", external: true },
  { href: "https://github.com", label: "GitHub", external: true },
  { href: UNSEEN_DOCS_URL, label: "Changelog", external: true },
  { href: "https://status.unseenfi.com", label: "Status", external: true },
] as const;

const paletteGroups = [
  {
    title: "Recent",
    items: pageLinks.slice(0, 3).map((item) => ({
      ...item,
      icon: Command,
    })),
  },
  {
    title: "Products",
    items: productMenu.map((item) => ({
      label: item.title.replace("Unseen ", ""),
      href: item.href,
      icon: item.icon,
    })),
  },
  {
    title: "Actions",
    items: [
      {
        label: "Start Building",
        href: UNSEEN_DOCS_URL,
        icon: ArrowRight,
      },
      {
        label: "Contact Sales",
        href: "/pricing",
        icon: CircleDollarSign,
      },
      {
        label: "System Status",
        href: "https://status.unseenfi.com",
        icon: Activity,
      },
    ],
  },
];

export function SiteShell({
  children,
  className,
  footerMode = "default",
  headerVariant = "default",
  footerVariant = "default",
}: {
  children: ReactNode;
  /** Merged onto `.unseen-site-root` (wraps nav + page body; use for page-specific nav tweaks). */
  className?: string;
  footerMode?: "default" | "compact";
  /** Minimal: logo + theme only (e.g. auditor tool). */
  headerVariant?: "default" | "minimal";
  /** Micro: copyright strip only. */
  footerVariant?: "default" | "micro";
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 100),
      window.setTimeout(() => setStage(2), 300),
      window.setTimeout(() => setStage(3), 500),
      window.setTimeout(() => setStage(4), 700),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <ScrollProgress />
      <Cursor active={stage >= 1} />
      {headerVariant === "default" ? <CommandPalette /> : null}
      <BetaLoginGateProvider>
        <div
          className={["unseen-site-root", className].filter(Boolean).join(" ")}
        >
          <Navbar stage={stage} variant={headerVariant} />
          <div className="unseen-site-shell">
            {children}
            <Footer mode={footerMode} variant={footerVariant} />
          </div>
        </div>
      </BetaLoginGateProvider>
    </LazyMotion>
  );
}

function Navbar({ stage, variant }: { stage: number; variant: "default" | "minimal" }) {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<"products" | "solutions" | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const { login, ready, authenticated } = usePrivy();
  const router = useRouter();
  const pendingRedirect = useBetaPendingRedirectRef();

  const openDashboardOrLogin = () => {
    if (ready && authenticated) {
      router.push("/dashboard");
      return;
    }

    pendingRedirect.current = true;
    login();
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current);
      }
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleMenuEnter = (menu: "products" | "solutions") => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
    }

    openTimerRef.current = window.setTimeout(
      () => setOpenMenu(menu),
      reducedMotion ? 0 : 100,
    );
  };

  const handleMenuLeave = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(
      () => setOpenMenu(null),
      reducedMotion ? 0 : 100,
    );
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setOpenMenu(null);
  };

  if (variant === "minimal") {
    return (
      <div className={`navbar-shell ${scrolled ? "is-scrolled" : ""}`}>
        <div className="navbar-inner">
          <m.div
            animate={{
              opacity: stage >= 2 ? 1 : 0,
              y: stage >= 2 ? 0 : -8,
            }}
            className="navbar-logo-wrap"
            transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <UnseenLogo />
          </m.div>
          <div style={{ flex: 1 }} aria-hidden />
          <m.div
            animate={{
              opacity: stage >= 4 ? 1 : 0,
              y: stage >= 4 ? 0 : -8,
            }}
            className="navbar-actions"
            transition={{ duration: reducedMotion ? 0 : 0.35 }}
          >
            <ThemeToggle />
          </m.div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`navbar-shell ${scrolled ? "is-scrolled" : ""}`}>
        <div className="navbar-inner">
          <m.div
            animate={{
              opacity: stage >= 2 ? 1 : 0,
              y: stage >= 2 ? 0 : -8,
            }}
            className="navbar-logo-wrap"
            transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <UnseenLogo />
          </m.div>

          <m.nav
            animate={{
              opacity: stage >= 3 ? 1 : 0,
              y: stage >= 3 ? 0 : -8,
            }}
            className="navbar-links"
            transition={{ duration: reducedMotion ? 0 : 0.35 }}
          >
            <div
              className="navbar-link-group"
              onMouseEnter={() => handleMenuEnter("products")}
              onMouseLeave={handleMenuLeave}
            >
              <button
                aria-expanded={openMenu === "products"}
                className="navbar-link navbar-link--button"
                data-cursor-hover="true"
                type="button"
              >
                Products
                <ChevronDown aria-hidden="true" size={14} />
              </button>
              <DropdownMenu
                items={productMenu}
                open={openMenu === "products"}
                title="Products"
              />
            </div>

            <div
              className="navbar-link-group"
              onMouseEnter={() => handleMenuEnter("solutions")}
              onMouseLeave={handleMenuLeave}
            >
              <button
                aria-expanded={openMenu === "solutions"}
                className="navbar-link navbar-link--button"
                data-cursor-hover="true"
                type="button"
              >
                Solutions
                <ChevronDown aria-hidden="true" size={14} />
              </button>
              <DropdownMenu
                items={solutionMenu}
                open={openMenu === "solutions"}
                title="Solutions"
              />
            </div>

            <Link
              className="navbar-link"
              data-cursor-hover="true"
              href={UNSEEN_DOCS_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              Developers
            </Link>
            <Link
              className="navbar-link"
              data-cursor-hover="true"
              href="/auditor"
            >
              Auditor
            </Link>
            <Link className="navbar-link" data-cursor-hover="true" href="/pricing">
              Pricing
            </Link>
          </m.nav>

          <m.div
            animate={{
              opacity: stage >= 4 ? 1 : 0,
              y: stage >= 4 ? 0 : -8,
            }}
            className="navbar-actions"
            transition={{ duration: reducedMotion ? 0 : 0.35 }}
          >
            <ThemeToggle />
            <button
              className="ghost-link"
              data-cursor-hover="true"
              onClick={openDashboardOrLogin}
              type="button"
            >
              {ready && authenticated ? "Dashboard" : "Log in"}
            </button>
            <PrimaryLink href={UNSEEN_DOCS_URL}>Start Building</PrimaryLink>
          </m.div>

          <button
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
            className="navbar-menu-button"
            data-cursor-hover="true"
            onClick={() => setDrawerOpen((value) => !value)}
            type="button"
          >
            {drawerOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen ? (
          <m.div
            animate={{ opacity: 1 }}
            className="mobile-drawer-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
          >
            <m.div
              animate={{ opacity: 1, y: 0 }}
              className="mobile-drawer-panel"
              exit={{ opacity: 0, y: -12 }}
              initial={{ opacity: 0, y: -12 }}
              onClick={(event) => event.stopPropagation()}
              transition={{ duration: reducedMotion ? 0 : 0.25 }}
            >
              <div className="mobile-drawer-head">
                <UnseenLogo compact />
                <button
                  aria-label="Close navigation menu"
                  className="mobile-drawer-close"
                  data-cursor-hover="true"
                  onClick={() => setDrawerOpen(false)}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mobile-drawer-section">
                <p className="mobile-drawer-label">Products</p>
                {productMenu.map((item) => (
                  <Link
                    className="mobile-drawer-link"
                    data-cursor-hover="true"
                    href={item.href}
                    key={item.href}
                    onClick={closeDrawer}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
              <div className="mobile-drawer-section">
                <p className="mobile-drawer-label">Explore</p>
                <Link
                  className="mobile-drawer-link"
                  href={UNSEEN_DOCS_URL}
                  onClick={closeDrawer}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Developers
                </Link>
                <Link className="mobile-drawer-link" href="/pricing" onClick={closeDrawer}>
                  Pricing
                </Link>
                <Link
                  className="mobile-drawer-link"
                  href="/auditor"
                  onClick={closeDrawer}
                >
                  Auditor
                </Link>
              </div>
              <div className="mobile-drawer-actions">
                <ThemeToggle />
                <button
                  className="ghost-link"
                  data-cursor-hover="true"
                  onClick={() => {
                    closeDrawer();
                    openDashboardOrLogin();
                  }}
                  type="button"
                >
                  {ready && authenticated ? "Dashboard" : "Log in"}
                </button>
                <PrimaryLink href={UNSEEN_DOCS_URL} onClick={closeDrawer}>
                  Start Building
                </PrimaryLink>
              </div>
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function DropdownMenu({
  items,
  open,
  title,
}: {
  items: MenuItem[];
  open: boolean;
  title: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <m.div
          animate={{ opacity: 1, y: 0 }}
          className="dropdown-panel glass-card"
          exit={{ opacity: 0, y: -8 }}
          initial={{ opacity: 0, y: -8 }}
          role="menu"
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="dropdown-title">{title}</p>
          <div className="dropdown-list">
            {items.map((item) => {
              const Icon = item.icon;
              const external = item.href.startsWith("http");

              return external ? (
                <a
                  className="dropdown-item"
                  data-cursor-hover="true"
                  href={item.href}
                  key={item.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span aria-hidden="true" className="dropdown-item__icon">
                    <Icon size={16} />
                  </span>
                  <span className="dropdown-item__copy">
                    <span className="dropdown-item__title">{item.title}</span>
                    <span className="dropdown-item__description">
                      {item.description}
                    </span>
                  </span>
                </a>
              ) : (
                <Link
                  className="dropdown-item"
                  data-cursor-hover="true"
                  href={item.href}
                  key={item.href}
                >
                  <span aria-hidden="true" className="dropdown-item__icon">
                    <Icon size={16} />
                  </span>
                  <span className="dropdown-item__copy">
                    <span className="dropdown-item__title">{item.title}</span>
                    <span className="dropdown-item__description">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function PrimaryLink({
  children,
  href,
  onClick,
}: {
  children: ReactNode;
  href: string;
  onClick?: () => void;
}) {
  const [ripples, setRipples] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);

  const onPointerDown = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const id = Date.now();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    setRipples((current) => [...current, { id, x, y }]);

    window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
    }, 500);
  };

  const external = href.startsWith("http");

  return (
    <Link
      className="primary-link"
      data-cursor-hover="true"
      href={href}
      onClick={onClick}
      onPointerDown={onPointerDown}
      {...(external
        ? { rel: "noopener noreferrer", target: "_blank" as const }
        : {})}
    >
      <span className="primary-link__label">{children}</span>
      <ArrowRight aria-hidden="true" className="button-arrow" size={16} />
      {ripples.map((ripple) => (
        <span
          className="primary-link__ripple"
          key={ripple.id}
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </Link>
  );
}

function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();

  const closePalette = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPaletteShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (isPaletteShortcut) {
        event.preventDefault();
        setOpen((value) => {
          const next = !value;
          if (!next) {
            setQuery("");
          }
          return next;
        });
      }

      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return paletteGroups;
    }

    return paletteGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(normalized),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          animate={{ opacity: 1 }}
          className="command-palette-backdrop"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={closePalette}
        >
          <m.div
            animate={{ opacity: 1, scale: 1 }}
            className="command-palette glass-card"
            exit={{ opacity: 0, scale: 0.96 }}
            initial={{ opacity: 0, scale: 0.95 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
          >
            <div className="command-palette__header">
              <Command aria-hidden="true" size={18} />
              <input
                aria-label="Search site links"
                className="command-palette__input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, docs, and actions"
                ref={inputRef}
                value={query}
              />
            </div>
            <div className="command-palette__body">
              {groups.map((group) => (
                <div className="command-palette__group" key={group.title}>
                  <p className="command-palette__label">{group.title}</p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const external = item.href.startsWith("http");

                    return external ? (
                      <a
                        className="command-palette__item"
                        data-cursor-hover="true"
                        href={item.href}
                        key={item.label}
                        onClick={closePalette}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="command-palette__item-icon">
                          <Icon size={15} />
                        </span>
                        <span>{item.label}</span>
                        <ExternalLink aria-hidden="true" size={14} />
                      </a>
                    ) : (
                      <Link
                        className="command-palette__item"
                        data-cursor-hover="true"
                        href={item.href}
                        key={item.label}
                        onClick={closePalette}
                      >
                        <span className="command-palette__item-icon">
                          <Icon size={15} />
                        </span>
                        <span>{item.label}</span>
                        <ArrowRight aria-hidden="true" size={14} />
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function Cursor({ active }: { active: boolean }) {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setEnabled(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled || !active) {
      document.body.classList.remove("cursor-hover");
      document.body.classList.remove("has-custom-cursor");
      return;
    }

    document.body.classList.add("has-custom-cursor");

    let animationFrame = 0;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    const interactiveSelector =
      "a, button, input, textarea, select, [data-cursor-hover='true']";

    const animate = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const onPointerMove = (event: PointerEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
      }

      const target = event.target as HTMLElement | null;
      const hoveringInteractive = !!target?.closest(interactiveSelector);
      document.body.classList.toggle("cursor-hover", hoveringInteractive);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      const hoveringInteractive = !!target?.closest(interactiveSelector);
      document.body.classList.toggle("cursor-hover", hoveringInteractive);
    };

    const onPointerLeave = () => {
      document.body.classList.remove("cursor-hover");
    };

    animationFrame = window.requestAnimationFrame(animate);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("focusin", onFocusIn);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("focusin", onFocusIn);
      document.body.classList.remove("cursor-hover");
      document.body.classList.remove("has-custom-cursor");
    };
  }, [active, enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <div
        className={`cursor-dot-shell ${active ? "is-active" : ""}`}
        id="cursor-dot"
        ref={dotRef}
      />
      <div
        className={`cursor-ring-shell ${active ? "is-active" : ""}`}
        id="cursor-ring"
        ref={ringRef}
      />
    </>
  );
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const height = document.body.scrollHeight - window.innerHeight;
      const next = height <= 0 ? 0 : window.scrollY / height;
      setProgress(next * 100);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return <div id="scroll-progress" style={{ height: `${progress}%` }} />;
}

function Footer({
  mode,
  variant = "default",
}: {
  mode: "default" | "compact";
  variant?: "default" | "micro";
}) {
  if (variant === "micro") {
    return (
      <footer className="site-footer site-footer--micro">
        <p className="site-footer--micro__text">© 2026 Unseen Finance</p>
      </footer>
    );
  }

  return (
    <footer className={`site-footer ${mode === "compact" ? "site-footer--compact" : ""}`}>
      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <UnseenLogo compact />
          <p className="site-footer__tagline">Confidential Finance on Solana.</p>
          <div className="site-footer__socials">
            <SocialLink ariaLabel="Follow Unseen Finance on X" href={SOCIAL_URL_X}>
              <IconBrandX size={16} />
            </SocialLink>
            <SocialLink ariaLabel="View Unseen Finance on GitHub" href="https://github.com">
              <IconBrandGithub size={16} />
            </SocialLink>
            <SocialLink ariaLabel="Join Unseen Finance on Discord" href="https://discord.com">
              <IconBrandDiscord size={16} />
            </SocialLink>
            <SocialLink
              ariaLabel="Join Unseen Finance on Telegram"
              href={SOCIAL_URL_TELEGRAM}
            >
              <IconBrandTelegram size={16} />
            </SocialLink>
          </div>
        </div>

        <FooterColumn
          links={productMenu.map((item) => ({
            href: item.href,
            label: item.title.replace("Unseen ", ""),
          }))}
          title="Products"
        />
        <FooterColumn links={companyLinks} title="Company" />
        <FooterColumn links={developerLinks} title="Developers" />
      </div>

      <div className="site-footer__bottom">
        <p>&copy; 2026 Unseen Finance. All rights reserved.</p>
        <div className="site-footer__legal">
          <Link href="/pricing">Privacy Policy</Link>
          <Link href="/pricing">Terms of Service</Link>
          <Link href="/pricing">Security</Link>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  links,
  title,
}: {
  links: ReadonlyArray<{ href: string; label: string; external?: boolean }>;
  title: string;
}) {
  return (
    <div className="site-footer__column">
      <p className="site-footer__column-title">{title}</p>
      <div className="site-footer__column-links">
        {links.map((link) =>
          link.external ? (
            <a
              className="site-footer__link"
              data-cursor-hover="true"
              href={link.href}
              key={link.label}
              rel="noreferrer"
              target="_blank"
            >
              <span className="site-footer__link-label">
                {link.label}
                {link.label === "Status" ? (
                  <span className="site-footer__status-dot" />
                ) : null}
              </span>
            </a>
          ) : (
            <Link
              className="site-footer__link"
              data-cursor-hover="true"
              href={link.href}
              key={link.label}
            >
              <span className="site-footer__link-label">
                {link.label}
                {link.label === "Status" ? (
                  <span className="site-footer__status-dot" />
                ) : null}
              </span>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

function SocialLink({
  ariaLabel,
  children,
  href,
}: {
  ariaLabel: string;
  children: ReactNode;
  href: string;
}) {
  return (
    <a
      aria-label={ariaLabel}
      className="site-footer__social"
      data-cursor-hover="true"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}
