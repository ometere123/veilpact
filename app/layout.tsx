import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";

export const metadata: Metadata = {
  title: "VeilPact: Private by default. Selective reveal when trust breaks.",
  description: "VeilPact is a GenLayer-native private clause-level pact settlement protocol with encrypted local terms and selective reveal.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
  openGraph: {
    title: "VeilPact",
    description: "Private by default. Committed on GenLayer. Selective reveal only when trust breaks.",
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
