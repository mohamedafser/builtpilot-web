import { getAppBaseUrl } from "@/lib/app-url";
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

const APP_TITLE = "BuildPilot | Construction Project Management Platform";
const APP_DESCRIPTION =
  "BuildPilot helps construction professionals manage projects, BOQs, materials, quotations, tasks, costs, and project progress in one intelligent workspace.";

const appUrl = getAppBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: "BuildPilot",
  title: {
    default: APP_TITLE,
    template: "%s · BuildPilot",
  },
  description: APP_DESCRIPTION,
  keywords: [
    "BuildPilot",
    "construction project management",
    "BOQ",
    "materials management",
    "quotations",
    "construction tasks",
    "project progress",
    "India",
    "UAE",
  ],
  authors: [{ name: "BuildPilot" }],
  creator: "BuildPilot",
  publisher: "BuildPilot",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: [
    {
      rel: "icon",
      url: "/icons/icon-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      rel: "icon",
      url: "/icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
    },
    {
      rel: "apple-touch-icon",
      url: "/icons/apple-touch-icon.png",
      sizes: "180x180",
    },
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: appUrl,
    siteName: "BuildPilot",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BuildPilot — Construction Project Management, Simplified",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: ["/og-image.png"],
  },
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
