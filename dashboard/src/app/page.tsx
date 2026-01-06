/**
 * DoAi.Me Landing Page
 * 깔끔하고 일관된 디자인
 *
 * @author DoAi.Me Team
 */

'use client';

import { Header } from "@/components/common/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/common/Footer";

export default function HomePage() {
  return (
    <main className="bg-[#050505] text-white min-h-screen">
      <Header />

      {/* Hero - 메인 히어로 섹션 */}
      <HeroSection />

      {/* About - 서비스 소개 */}
      <AboutSection />

      {/* Features - 주요 기능 */}
      <FeaturesSection />

      {/* CTA - 가입 유도 */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </main>
  );
}
