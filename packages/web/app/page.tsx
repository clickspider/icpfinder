// SPDX-License-Identifier: MIT

import { Footer } from "../components/marketing/Footer";
import { Hero } from "../components/marketing/Hero";
import { Nav } from "../components/marketing/Nav";

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
      <main id="main" className="flex flex-1 flex-col justify-center">
        <Hero />
      </main>
      <Footer />
    </>
  );
}
