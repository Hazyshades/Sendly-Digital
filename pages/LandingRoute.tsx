import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gift, Send, Download, ArrowRight, Zap, ArrowRightIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { BlurText } from '../components/BlurText';
import { StarBorder } from '../components/ui/star-border';
import { SocialLogos } from '../components/SocialLogos';

export function LandingRoute() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % 3);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleAction = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#DADEFF' }}>
      <div className="abstract-shape"></div>
      
      {/* Header */}
      <header
        className={`fixed top-10 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-md shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-400 rounded-2xl flex items-center justify-center cursor-pointer shadow-circle-card">
                <Gift className="w-7 h-7 text-white" />
              </div>
              <span className="text-gray-900 text-2xl font-semibold">Sendly</span>
            </div>

            <div className="flex items-center gap-4 md:gap-6">
              <nav className="hidden md:flex items-center gap-6">
                <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  Features
                </a>
                <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  About
                </a>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-8 pb-12 px-6 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight relative min-h-[120px] md:min-h-[140px] lg:min-h-[160px]">
                {/* First text: Tag. Send. Crypto. */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${
                    currentTextIndex === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <BlurText delay={0} duration={1200}>
                    Tag.
                  </BlurText>
                  <BlurText delay={200} duration={1200}>
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {' '}Send.
                    </span>
                  </BlurText>
                  <BlurText delay={400} duration={1200}>
                    {' '}Crypto.
                  </BlurText>
                </div>
                
                {/* Second text: Send Crypto by @. */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${
                    currentTextIndex === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <BlurText delay={0} duration={1200}>
                    Send
                  </BlurText>
                  <span className="inline-block w-3"></span>
                  <BlurText delay={200} duration={1200}>
                    Crypto
                  </BlurText>
                  <span className="inline-block w-3"></span>
                  <BlurText delay={400} duration={1200}>
                    by
                  </BlurText>
                  <span className="inline-block w-3"></span>
                  <BlurText delay={400} duration={1200}>
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      @.
                    </span>
                  </BlurText>
                </div>

                {/* 3rd text: No Wallet. Just @. */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${
                    currentTextIndex === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <BlurText delay={0} duration={1200}>
                    No Wallet.
                  </BlurText>
                  <span className="inline-block w-3"></span>
                  <BlurText delay={200} duration={1200}>
                    Just
                  </BlurText>
                  <span className="inline-block w-3"></span>
                  <BlurText delay={200} duration={1200}>
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      @.
                    </span>
                  </BlurText>
                </div>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                <BlurText delay={400} duration={1200}>
                Dispatch funds by nickname on any social network

</BlurText>
              </p>
            </div>

            {/* Social Logos */}
            <SocialLogos />

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <BlurText delay={1100} duration={1200}>
                <StarBorder color="#fbbf24" speed="5s" className="w-full sm:w-auto">
                  <Button
                    onClick={() => handleAction('/create')}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full sm:w-auto"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Send
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </StarBorder>
              </BlurText>

              <BlurText delay={1200} duration={1200}>
                <StarBorder color="#fbbf24" speed="5s" className="w-full sm:w-auto">
                  <Button
                    onClick={() => handleAction('/my')}
                    size="lg"
                    variant="outline"
                    className="bg-white/90 backdrop-blur-sm border-2 border-gray-200 hover:bg-white text-gray-900 px-8 py-6 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full sm:w-auto"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Receive
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </StarBorder>
              </BlurText>

              <BlurText delay={1300} duration={1200}>
                <StarBorder color="#fbbf24" speed="5s" className="w-full sm:w-auto">
                  <Button
                    onClick={() => handleAction('/bridge')}
                    size="lg"
                    variant="outline"
                    className="bg-white/90 backdrop-blur-sm border-2 border-blue-200 hover:bg-blue-50 text-blue-600 px-8 py-6 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full sm:w-auto"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Bridge
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </StarBorder>
              </BlurText>

              {/* Gateway button removed */}
            </div>
          </div>
        </div>
      </section>

      {/* Features section removed */}

      {/* CTA Section */}
      <section className="py-20 px-6 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl rounded-2xl border-0 overflow-hidden">
            <CardContent className="p-12 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Ready to Start?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Dispatch funds by nickname on any social network.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={() => handleAction('/create')}
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  It's Free
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-6 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-400 rounded-2xl flex items-center justify-center">
                  <Gift className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy" className="text-sm hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-sm hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/faq" className="text-sm hover:text-white transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/litepaper" className="text-sm hover:text-white transition-colors">
                    Litepaper
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="text-sm hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Navigation</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-sm hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#about" className="text-sm hover:text-white transition-colors">
                    About
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <p className="text-sm text-gray-400">
X: Leonissx              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            © 2025 Sendly. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
