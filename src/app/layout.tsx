import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casa App - Tareas del Hogar",
  description: "Gestión de tareas del hogar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased text-white">{children}</body>
    </html>
  );
}
