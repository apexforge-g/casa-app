import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casa App - Tareas del Hogar",
  description: "Gestión de tareas del hogar para Jorge y Nancy",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
