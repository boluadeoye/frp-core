import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FRP // Forensic Reality Protocol",
  description: "Sovereign Truth Infrastructure for AI Agents and DePIN. Deterministic physical state verification powered by solar physics and cryptography.",
  keywords: ["Forensic AI", "DePIN Security", "C2PA", "Physical State Verification", "Bolu Adeoye", "Truth Oracle"],
  openGraph: {
    title: "FRP // Forensic Reality Protocol",
    description: "The Mathematical Seal of Reality.",
    type: "website",
    url: "https://frp-core.vercel.app",
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://frp-core.vercel.app/#protocol",
        "name": "Forensic Reality Protocol",
        "applicationCategory": "SecurityApplication",
        "operatingSystem": "Any",
        "description": "Deterministic physical state verification using SunCalc and ECDSA signatures.",
        "author": { "@id": "https://frp-core.vercel.app/#person" },
        "offers": {
          "@type": "Offer",
          "price": "0.10",
          "priceCurrency": "USD"
        }
      },
      {
        "@type": "Person",
        "@id": "https://frp-core.vercel.app/#person",
        "name": "Bolu Adeoye",
        "jobTitle": "Strategic Systems Architect",
        "description": "Former Global Forensic Consultant at Deloitte, specializing in cryptographic truth and systems architecture.",
        "sameAs": [
          "https://linkedin.com/in/bolu-adeoye",
          "https://x.com/boluadeoye"
        ]
      }
    ]
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} bg-black`}>{children}</body>
    </html>
  );
}
