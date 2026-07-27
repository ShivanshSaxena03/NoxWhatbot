import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import VerificationModal from "@/components/VerificationModal";
import ImportantToast from "@/components/ImportantToast";
import AuthGuard from "@/components/AuthGuard";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Nox - Personal WhatsApp AI Assistant",
  description: "Minimalist Apple-style Personal WhatsApp AI Assistant Dashboard",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#ffffff"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-white text-gray-900 antialiased pb-16 md:pb-0">
        <AuthGuard>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">{children}</main>
          </div>
          <MobileNav />
          <VerificationModal />
          <ImportantToast />
        </AuthGuard>
      </body>
    </html>
  );
}
