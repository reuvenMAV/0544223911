import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "מורה אישי לאנגלית",
  description: "מסלול אנגלית אמריקאית מותאם אישית לדוברי עברית",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
