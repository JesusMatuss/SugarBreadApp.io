import "./globals.css";

export const metadata = {
  title: "Despacho de Pedidos",
  description: "Gestión y despacho de pedidos de panadería mayorista",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
