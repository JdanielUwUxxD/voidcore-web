import { Chakra_Petch, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";
import Nav from "../components/Nav";
import DiscordGate from "../components/DiscordGate";

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
        <AuthProvider>
          <Nav />
          <DiscordGate>{children}</DiscordGate>
        </AuthProvider>
      </body>
    </html>
  );
}
