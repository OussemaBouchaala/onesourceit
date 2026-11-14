import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { CartProvider } from "@/components/cart/cart-context";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "ONEsource IT — Grossiste téléphones et accessoires à Sfax",
    template: "%s — ONEsource IT",
  },
  description:
    "Coques, protections et accessoires pour Samsung, Redmi et Infinix. Prix détail et prix revendeur. Retrait à Sfax ou livraison partout en Tunisie.",
};

export const viewport: Viewport = {
  themeColor: "#052035",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="fr">
        <body className={`${inter.variable} ${poppins.variable} antialiased`}>
          <ConvexClientProvider>
            <CartProvider>{children}</CartProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
