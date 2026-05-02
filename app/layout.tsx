import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { PrivyClientProvider } from "@/components/providers/privy-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://unseen.finance"),
  title: {
    default: "UNSEEN FINANCE",
    template: "%s · UNSEEN FINANCE",
  },
  description: "The Gateway to Confidential Finance on Solana.",
};

const themeScript = `(function(){try{var t=localStorage.getItem("unseen-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}else if(window.matchMedia("(prefers-color-scheme:light)").matches){document.documentElement.setAttribute("data-theme","light")}else{document.documentElement.setAttribute("data-theme","dark")}}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <PrivyClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </PrivyClientProvider>
      </body>
    </html>
  );
}
