import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PokéScout",
  description: "Pokémon TCG market intelligence. Demand vs available supply, not a price tracker.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="brand">POKESCOUT // MARKET INTELLIGENCE</div>
            <nav>
              <a href="/">Terminal</a> · <a href="/scanner">Scanner</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
