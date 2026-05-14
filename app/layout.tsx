import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import { PrivyClientProvider } from "@/components/providers/privy-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { defaultOpenGraphImages, defaultTwitterImages } from "@/lib/seo-sharing";
import {
  DEFAULT_DESCRIPTION,
  SEO_ASSETS,
  SITE_NAME,
  SITE_TAGLINE,
  getSiteUrl,
} from "@/lib/site-config";
import "./globals.css";

const siteUrl = getSiteUrl();

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0918" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Unseen Finance",
    "Solana",
    "privacy",
    "shielded payments",
    "confidential finance",
    "Umbra",
    "USDC",
    "merchant payments",
    "payroll",
    "Web3 payments",
  ],
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_TAGLINE,
    images: defaultOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_TAGLINE,
    images: defaultTwitterImages(),
  },
  icons: {
    icon: [{ url: SEO_ASSETS.icon, type: "image/png" }],
    apple: [{ url: SEO_ASSETS.appleTouchIcon, sizes: "180x180", type: "image/png" }],
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

const themeScript = `(function(){try{var t=localStorage.getItem("unseen-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}else{document.documentElement.setAttribute("data-theme","light")}}catch(e){document.documentElement.setAttribute("data-theme","light")}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SiteJsonLd />
        <PrivyClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
          <Analytics />
        </PrivyClientProvider>
      </body>
    </html>
  );
}
