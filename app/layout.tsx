import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeilPact — Private agreements. Public fairness only when it matters.",
  description:
    "VeilPact is a GenLayer-native private two-party agreement protocol where parties commit to encrypted terms up front and reveal only the disputed clause when needed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-void-ink text-parchment font-body antialiased">
        {children}
      </body>
    </html>
  );
}
