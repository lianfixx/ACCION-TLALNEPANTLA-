import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/source-sans-3";
import "@fontsource-variable/source-serif-4";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: [{ url: "/images/real/pan-logo-oficial.png", type: "image/png" }],
    apple: [{ url: "/images/real/pan-logo-oficial.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: "/images/og-tlalnepantla.png", width: 1200, height: 630, alt: "Acción Política Juvenil Tlalnepantla: seis comisiones con tareas concretas." }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/images/og-tlalnepantla.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "es-MX",
      },
    ],
  }).replaceAll("<", "\\u003c");
  return (
    <html lang="es-MX">
      <body>
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
        <a className="skip-link" href="#main-content">Saltar al contenido</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
