import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function Philosophy() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Split text reveal animation
      const lines = document.querySelectorAll('.manifesto-line');
      
      lines.forEach((line) => {
        const words = line.querySelectorAll('.word');
        
        gsap.from(words, {
          scrollTrigger: {
            trigger: line,
            start: 'top 85%',
            end: 'bottom 60%',
            toggleActions: 'play none none reverse',
          },
          y: 40,
          opacity: 0,
          stagger: 0.08,
          duration: 0.8,
          ease: 'power3.out',
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const line1 = "Others ask: What's your wallet address?";
  const line2 = "We send to your @.";

  return (
    <section 
      ref={containerRef}
      className="relative py-24 md:py-32 px-6 md:px-16 lg:px-24 overflow-hidden"
      style={{ 
        backgroundColor: '#0a0a0f',
      }}
    >
      {/* Parallax Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      />

      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(10,10,15,0.8) 0%, rgba(10,10,15,0.95) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* First Line */}
        <div className="manifesto-line mb-8">
          <p className="font-jakarta text-lg md:text-2xl text-gray-400 leading-relaxed">
            {line1.split(' ').map((word, i) => (
              <span key={i} className="word inline-block mr-2">{word}</span>
            ))}
          </p>
        </div>

        {/* Second Line - Emphasis */}
        <div className="manifesto-line">
          <p className="font-cormorant italic text-5xl md:text-7xl lg:text-8xl text-white font-bold leading-none">
            {line2.split(' ').map((word, i) => (
              <span key={i} className="word inline-block mr-4">{word}</span>
            ))}
          </p>
        </div>

        {/* Decorative Element */}
        <div className="mt-16 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sendly-coral/50 to-transparent" />
          <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">The Manifesto</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sendly-coral/50 to-transparent" />
        </div>
      </div>
    </section>
  );
}
