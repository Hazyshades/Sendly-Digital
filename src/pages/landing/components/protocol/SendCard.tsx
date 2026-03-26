import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScanLine, ArrowRight, Wallet } from 'lucide-react';

export function SendCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });

      // Scan line animation
      tl.to('.scan-line', {
        y: 200,
        duration: 2,
        ease: 'power2.inOut',
      })
      .to('.scan-line', {
        y: 0,
        duration: 2,
        ease: 'power2.inOut',
      }, '+=0.5');

      // Text transformation
      tl.fromTo('.wallet-address',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        '+=1'
      )
      .to('.wallet-address', {
        opacity: 0,
        y: -20,
        duration: 0.3,
      }, '+=2');

      // Wave effect
      tl.to('.wave-ring', {
        scale: 1.5,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
      }, '-=0.5');
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-2xl mx-auto p-8 md:p-12 rounded-[3rem]"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl" style={{ background: 'rgba(249, 115, 22, 0.2)' }}>
            <ScanLine className="w-8 h-8 text-sendly-coral" />
          </div>
        </div>
        <h3 className="font-jakarta font-bold text-3xl md:text-4xl text-white mb-4">
          Send
        </h3>
        <p className="font-cormorant italic text-xl text-gray-400">
          Laser-Fast Resolution
        </p>
      </div>

      {/* Scanning Visualization */}
      <div className="relative h-64 md:h-80 flex items-center justify-center">
        {/* Handle Display */}
        <div className="text-center z-10">
          <div className="mb-8">
            <p className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-2">
              Recipient
            </p>
            <div className="font-cormorant italic text-5xl md:text-6xl text-white font-bold">
              @VitalikButerin
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center mb-8">
            <ArrowRight className="w-8 h-8 text-sendly-coral" />
          </div>

          {/* Wallet Address (appears after scan) */}
          <div className="wallet-address">
            <p className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-2">
              Resolved Address
            </p>
            <div className="font-mono text-lg text-sendly-coral bg-sendly-coral/10 px-4 py-2 rounded-xl">
              0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
            </div>
          </div>
        </div>

        {/* Scan Line */}
        <div 
          className="scan-line absolute left-0 right-0 h-px"
          style={{
            top: 0,
            background: 'linear-gradient(90deg, transparent 0%, #f97316 50%, transparent 100%)',
            boxShadow: '0 0 20px rgba(249, 115, 22, 0.8)',
          }}
        />

        {/* Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249, 115, 22, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249, 115, 22, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Wave Rings */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="wave-ring absolute rounded-full border-2 border-sendly-coral/30"
            style={{
              width: '300px',
              height: '300px',
              opacity: 0,
              scale: 1,
            }}
          />
        ))}
      </div>

      {/* Status */}
      <div className="mt-8 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-gray-500" />
          <span className="font-mono text-xs text-gray-400">zkSync Era</span>
        </div>
        <div className="w-px h-4 bg-gray-700" />
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
          </span>
          <span className="font-mono text-xs text-gray-400">~0.3s</span>
        </div>
      </div>
    </div>
  );
}
