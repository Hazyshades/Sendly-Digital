import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link } from 'react-router-dom';

export function Navbar() {
  const navbarRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 50;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(navbarRef.current, {
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(20px)' : 'blur(0)',
        borderColor: isScrolled ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
        duration: 0.3,
        ease: 'power2.out',
      });
    }, navbarRef);

    return () => ctx.revert();
  }, [isScrolled]);

  return (
    <div
      ref={navbarRef}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-40 transition-colors duration-300"
      style={{
        borderRadius: '2rem',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <nav className="flex items-center gap-8 px-6 py-3">
        {/* Logo */}
        <Link to="/" className="relative group">
          <span 
            className={`font-outfit font-bold text-xl transition-colors duration-300 ${
              isScrolled ? 'text-sendly-void' : 'text-white'
            }`}
          >
            Sendly
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <a 
            href="#features" 
            className={`font-jakarta text-sm font-medium transition-colors duration-300 hover:text-sendly-coral ${
              isScrolled ? 'text-sendly-void' : 'text-white'
            }`}
          >
            Features
          </a>
          <a 
            href="#protocol" 
            className={`font-jakarta text-sm font-medium transition-colors duration-300 hover:text-sendly-coral ${
              isScrolled ? 'text-sendly-void' : 'text-white'
            }`}
          >
            Protocol
          </a>
          <a 
            href="#membership" 
            className={`font-jakarta text-sm font-medium transition-colors duration-300 hover:text-sendly-coral ${
              isScrolled ? 'text-sendly-void' : 'text-white'
            }`}
          >
            Membership
          </a>
        </div>

        {/* Live Network Status */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <span className={`font-mono text-xs ${isScrolled ? 'text-gray-500' : 'text-white/70'}`}>
              24ms
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          to="/dashboard"
          className="font-jakarta text-sm font-semibold px-4 py-2 rounded-2xl transition-all duration-300 hover:scale-105"
          style={{
            background: isScrolled 
              ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' 
              : 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
            color: 'white',
          }}
        >
          Launch App
        </Link>
      </nav>
    </div>
  );
}
