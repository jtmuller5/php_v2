import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hippocampome",
  description:
    "A curated knowledge base of neuron types in the rodent hippocampus, with morphology, electrophysiology, molecular markers, connectivity, and simulation tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-gray-50 font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 bg-white py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-400">
              Hippocampome.org (RRID:SCR_009023) — A curated knowledge base of
              neuron types in the rodent hippocampus.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
