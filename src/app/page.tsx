import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { DownloadSection } from "@/components/landing/download";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Trust } from "@/components/landing/trust";
import { Features } from "@/components/landing/features";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="bg-[#0a0a0f]">
      <Navbar />
      <Hero />
      <DownloadSection />
      <HowItWorks />
      <Trust />
      <Features />
      <CTA />
      <Footer />
    </main>
  );
}
