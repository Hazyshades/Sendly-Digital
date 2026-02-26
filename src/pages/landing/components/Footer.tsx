import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { X, Github, Linkedin, Mail, Twitch, Send, Heart } from 'lucide-react';

const socialLinks = [
  { icon: X, href: '#', label: 'X' },
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Mail, href: '#', label: 'Email' },
  { icon: Twitch, href: '#', label: 'Twitch' },
  { icon: Send, href: '#', label: 'Telegram' },
];

const footerLinks = {
  Product: ['Features', 'Protocol', 'Membership', 'API'],
  Company: ['About', 'Blog', 'Careers', 'Press'],
  Resources: ['Documentation', 'Help Center', 'Community', 'Status'],
  Legal: ['Privacy', 'Terms', 'Cookies', 'Licenses'],
};

export function Footer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.footer-content', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 90%',
        },
        y: 60,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer 
      ref={containerRef}
      className="relative px-6 md:px-16 lg:px-24 pt-24 pb-12"
      style={{ 
        backgroundColor: '#0a0a0f',
        borderRadius: '4rem 4rem 0 0',
      }}
    >
      {/* Status Bar */}
      <div className="footer-content flex flex-col md:flex-row items-center justify-between gap-6 pb-12 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
          </span>
          <span className="font-jakarta font-semibold text-white text-lg">
            System Operational
          </span>
        </div>
        
        <div className="flex items-center gap-6 font-mono text-sm text-gray-400">
          <span>Latency: <span className="text-green-400">24ms</span></span>
          <span className="hidden md:inline">|</span>
          <span>Blocks: <span className="text-white">18,429,301</span></span>
          <span className="hidden md:inline">|</span>
          <span>Gas: <span className="text-sendly-coral">24 gwei</span></span>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="footer-content py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <div className="mb-6">
              <span className="font-outfit font-bold text-2xl text-white">
                Sendly
              </span>
            </div>
            <p className="font-cormorant italic text-gray-400 text-lg mb-6">
              Money is Social.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social, i) => {
                const Icon = social.icon;
                return (
                  <a
                    key={i}
                    href={social.href}
                    className="p-2 rounded-xl transition-all duration-300 hover:scale-110"
                    style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-jakarta font-semibold text-white text-sm uppercase tracking-wider mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="font-jakarta text-sm text-gray-400 hover:text-white transition-colors duration-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-content flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10">
        <p className="font-mono text-xs text-gray-500">
          © 2024 Sendly. All rights reserved.
        </p>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <span className="font-mono text-xs">Built with</span>
          <Heart className="w-3 h-3 text-sendly-coral" />
          <span className="font-mono text-xs">on zkSync</span>
        </div>
      </div>
    </footer>
  );
}
