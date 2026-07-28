import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CapsuleNav } from '@/components/landing-page/capsule-nav';
import { HeroSection } from '@/components/landing-page/hero-section';
import { HowItWorksSection } from '@/components/landing-page/how-it-works-section';
import { PlatformsSection } from '@/components/landing-page/platforms-section';
import { AgentsSection } from '@/components/landing-page/agents-section';
import { FooterSection } from '@/components/landing-page/footer-section';
import { SmoothScroll } from '@/components/landing-page/smooth-scroll';
import { isZkHost } from '@/lib/runtime/zkHost';

export function LandingRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isZkHost()) {
      navigate('/payments', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.fontSize;
    root.style.fontSize = '16px';
    return () => { root.style.fontSize = prev; };
  }, []);

  return (
    <SmoothScroll>
      <main className="relative min-h-screen bg-mist">
        <CapsuleNav />
        <HeroSection />
        <HowItWorksSection />
        <PlatformsSection />
        <AgentsSection />
        <FooterSection />
      </main>
    </SmoothScroll>
  );
}
