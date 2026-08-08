import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Support Signal — AI Customer Support Agent",
  description: "AI-powered customer support, trained on our documentation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}