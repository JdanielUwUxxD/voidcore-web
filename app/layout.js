import { Chakra_Petch, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";
import AppShell from "../components/AppShell";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  title: "VoidCore Studios",
  description: "Eventos de Minecraft de VoidCore Studios",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable}`}>
        <div className="starfield">
          <div className="stars-layer stars-1" />
          <div className="stars-layer stars-2" />
        </div>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
