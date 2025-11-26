import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Stick Figure Studio",
  description: "Create and manage stylized stick figure poses"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <main className="h-full">{children}</main>
      </body>
    </html>
  );
}
