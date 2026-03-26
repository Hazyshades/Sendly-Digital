import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '@/components/landing-page/hero-section';
import { SignalsSection } from '@/components/landing-page/signals-section';
import { WorkSection } from '@/components/landing-page/work-section';
import { PrinciplesSection } from '@/components/landing-page/principles-section';
import { ColophonSection } from '@/components/landing-page/colophon-section';
import { SideNav } from '@/components/landing-page/side-nav';
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
      <main className="relative min-h-screen circle-gradient-bg">
        <div className="abstract-shape" />
        <SideNav />
        <div className="relative z-10">
          <HeroSection />
          <SignalsSection />
          <WorkSection />
          <PrinciplesSection />
          <ColophonSection />
        </div>
      </main>
    </SmoothScroll>
  );
}
