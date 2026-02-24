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
      <body className="antialiased text-white flex flex-col min-h-screen">
        <div className="flex-1">{children}</div>
        <footer className="text-center text-slate-600 text-sm py-4">
          Jorge & Nancy 🏠 2026
        </footer>
      </body>
    </html>
  );
}
