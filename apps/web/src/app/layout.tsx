import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Absurt Mahkeme",
  description: "Arkadaslarla absurt mini mahkeme oyunu"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
