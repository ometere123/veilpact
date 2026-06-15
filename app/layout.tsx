import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";

export const metadata: Metadata = {
  title: "VeilPact — Private agreements. Public fairness only when it matters.",
  description: "VeilPact is a GenLayer-native private two-party agreement protocol with clause-level commitments, AES-256 encryption, and AI arbitration.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
  openGraph: {
    title: "VeilPact",
    description: "Private agreements. Public fairness only when it matters.",
    images: [{ url: "/logo.svg" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#0B0B10", color: "#EFE4D0" }}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
