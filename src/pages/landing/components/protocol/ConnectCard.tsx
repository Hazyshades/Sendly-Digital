import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { X, Github, Linkedin, Mail, Twitch, Send, Zap } from 'lucide-react';

const socialLogos = [
  { icon: X, name: 'X' },
  { icon: Github, name: 'GitHub' },
  { icon: Linkedin, name: 'LinkedIn' },
  { icon: Mail, name: 'Gmail' },
  { icon: Twitch, name: 'Twitch' },
  { icon: Send, name: 'Telegram' },
];

export function ConnectCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });

      // Animate nodes connecting
      socialLogos.forEach((_, i) => {
        tl.to(`.node-${i}`, {
          scale: 1.2,
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        })
        .to(`.node-${i}`, {
          scale: 1,
          opacity: 0.8,
          duration: 0.3,
        }, `+=0.2`);
      });

      // Connect lines
      tl.to('.connection-line', {
        strokeDashoffset: 0,
        duration: 1.5,
        ease: 'power2.inOut',
      }, '-=1');
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
            <Zap className="w-8 h-8 text-sendly-coral" />
          </div>
        </div>
        <h3 className="font-jakarta font-bold text-3xl md:text-4xl text-white mb-4">
          Connect
        </h3>
        <p className="font-cormorant italic text-xl text-gray-400">
          Link Your Social Identity
        </p>
      </div>

      {/* Network Visualization */}
      <div className="relative h-64 md:h-80">
        {/* Central Node (Sendly Logo) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              border: '2px solid rgba(249, 115, 22, 0.5)',
              boxShadow: '0 0 60px rgba(249, 115, 22, 0.3)',
            }}
          >
            <span className="font-outfit font-bold text-2xl text-white">S</span>
          </div>
        </div>

        {/* Connection Lines SVG */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(249, 115, 22, 0)" />
              <stop offset="50%" stopColor="rgba(249, 115, 22, 0.8)" />
              <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
            </linearGradient>
          </defs>
          {socialLogos.map((_, i) => {
            const angle = (i / socialLogos.length) * Math.PI + Math.PI;
            const x = 200 + Math.cos(angle) * 120;
            const y = 150 + Math.sin(angle) * 80;
            return (
              <line
                key={i}
                className="connection-line"
                x1="200"
                y1="150"
                x2={x}
                y2={y}
                stroke="url(#lineGradient)"
                strokeWidth="2"
                strokeDasharray="150"
                strokeDashoffset="150"
              />
            );
          })}
        </svg>

        {/* Social Nodes */}
        <div className="absolute inset-0 flex items-center justify-around px-8">
          {socialLogos.slice(0, 3).map((social, i) => {
            const Icon = social.icon;
            return (
              <div
                key={i}
                className={`node-${i} p-4 rounded-2xl transition-all duration-300`}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  opacity: 0.5,
                }}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-around px-8">
          {socialLogos.slice(3).map((social, i) => {
            const Icon = social.icon;
            return (
              <div
                key={i}
                className={`node-${i + 3} p-4 rounded-2xl transition-all duration-300`}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  opacity: 0.5,
                }}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(249, 115, 22, 0.1)' }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
          </span>
          <span className="font-mono text-xs text-sendly-coral">6 Networks Connected</span>
        </div>
      </div>
    </div>
  );
}
