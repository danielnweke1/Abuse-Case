import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Abuse Case — Threat Modelling Workbench",
  description: "Automated, grounded threat modeling workbench for security professionals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
