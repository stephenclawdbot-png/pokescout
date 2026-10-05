import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PokéScout",
  description: "Pokémon card scout with real card art and delayed market guides.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="brand">POKÉSCOUT</div>
            <nav>
              <a href="/">Board</a>
              <a href="/feed">Feed</a>
              <a href="/scanner">Scanner</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
