import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseWatch — Production API & Website Monitoring SaaS",
  description:
    "Full-stack multi-tenant monitoring platform with scheduled BullMQ workers, automated incident management, SSRF protection, and public status pages.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
