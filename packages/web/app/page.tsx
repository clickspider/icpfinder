// SPDX-License-Identifier: MIT

import { Hero } from "../components/marketing/Hero";
import { Nav } from "../components/marketing/Nav";
import { Footer } from "../components/marketing/Footer";

export default function MarketingLanding() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[color:var(--bg-elev)] focus:px-4 focus:py-2 focus:text-sm focus:text-[color:var(--text)] focus:shadow-md"
      >
        Skip to main content
      </a>
      <Nav />
      <main id="main">
        <Hero />
      </main>
      <Footer />
    </>
  );
}
