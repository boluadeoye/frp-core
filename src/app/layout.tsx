import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FRP | Forensic Reality Protocol",
  description: "The Truth Oracle for AI Agents and DePIN. Physical State Verification powered by Llama 4 Scout.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Forensic Reality Protocol",
    "applicationCategory": "SecurityApplication",
    "operatingSystem": "Any",
    "author": {
      "@type": "Person",
      "name": "Bolu Adeoye",
      "jobTitle": "Strategic Systems Architect & Forensic Specialist",
      "url": "https://linkedin.com/in/bolu-adeoye"
    },
    "description": "Deterministic physical state verification for AI Agents using C2PA and Llama 4 Scout.",
    "offers": {
      "@type": "Offer",
      "price": "0.10",
      "priceCurrency": "USD"
    }
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
