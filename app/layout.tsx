import type { Metadata } from "next";
import { Inter, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '../components/AuthProvider';
import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
});

export const metadata: Metadata = {
  title: "Manuscale - The Publishing Engine",
  description: "Professional AI-powered publishing studio. Transform ideas into marketable digital products.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" async></script>
        <script src="https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js" async></script>
      </head>
      <body className="font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
