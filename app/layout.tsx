import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jev Bulk Classifier",
  description: "Bulk text classification powered by TypeSafe Jev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
