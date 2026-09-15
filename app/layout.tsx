import { Providers } from "@/components/providers";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const stripExtensionAttributes = `
(function () {
  var blocked = {
    "cz-shortcut-listen": true,
    "data-new-gr-c-s-check-loaded": true,
    "data-gr-ext-installed": true
  };
  function isRoot(el) {
    return el === document.documentElement || el === document.body;
  }
  var proto = Element.prototype;
  var setAttribute = proto.setAttribute;
  proto.setAttribute = function (name, value) {
    if (blocked[String(name)] && isRoot(this)) {
      return;
    }
    return setAttribute.call(this, name, value);
  };
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://buildpilot.app"),
  applicationName: "BuildPilot",
  title: {
    default: "BuildPilot",
    template: "%s · BuildPilot",
  },
  description:
    "Construction management for civil engineers and small contractors—projects, labour, materials, quotations, BOQ, client portal, AI, and WhatsApp. Built for India and the UAE.",
  manifest: "/manifest.webmanifest",
  icons: [
    {
      rel: "icon",
      url: "/icons/icon-192x192.png",
    },
    {
      rel: "apple-touch-icon",
      url: "/icons/icon-192x192.png",
    },
  ],
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "BuildPilot",
  },
};

export const viewport = {
  themeColor: "#FF7A45",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Script id="strip-extension-attrs" strategy="beforeInteractive">
          {stripExtensionAttributes}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
