import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Planner",
  description: "Planner finanziario personale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="bg-zinc-50 text-zinc-950 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />

          <div className="min-w-0 flex-1">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
