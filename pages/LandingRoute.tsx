import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gift, ArrowRight, CreditCard, Image } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { BlurText } from '../components/BlurText';
import { StarBorder } from '../components/ui/star-border';
import { SocialLogos } from '../components/SocialLogos';
import { toZkUrl, isZkHost } from '../utils/runtime/zkHost';
import { SplashScreen } from '../components/SplashScreen';

export function LandingRoute() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const paymentsCtaDisabled = true;

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

  useEffect(() => {
    if (isZkHost()) {
      navigate('/payments', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleAction = (path: string) => {
    navigate(path);
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#DADEFF' }}>
      <div className="abstract-shape"></div>
      
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/70 backdrop-blur-md shadow-lg'
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

            {/* <div className="flex items-center gap-4 md:gap-6">
              <nav className="hidden md:flex items-center gap-6">
                <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  Features
                </a>
                <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  About
                </a>
              </nav>
            </div> */}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-6 pb-12 px-6 relative z-10">
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
            </div>

            {/* Social Logos */}
            <SocialLogos />

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <BlurText delay={1100} duration={1200}>
                <StarBorder color="#fbbf24" speed="5s" className="w-full sm:w-auto">
                  <Button
                    type="button"
                    disabled={paymentsCtaDisabled}
                    aria-disabled={paymentsCtaDisabled}
                    title={paymentsCtaDisabled ? 'Temporarily unavailable' : 'Open Payments'}
                    onClick={() => {
                      if (paymentsCtaDisabled) return;
                      window.location.href = toZkUrl(window.location.origin + '/payments');
                    }}
                    size="lg"
                    className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-6 text-lg font-semibold rounded-2xl shadow-lg transition-all duration-200 w-full sm:w-auto ${
                      paymentsCtaDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:from-blue-700 hover:to-purple-700 hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payments
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </StarBorder>
              </BlurText>

              <BlurText delay={1200} duration={1200}>
                <StarBorder color="#fbbf24" speed="5s" className="w-full sm:w-auto">
                  <Button
                    onClick={() => handleAction('/create')}
                    size="lg"
                    variant="outline"
                    className="bg-white/90 backdrop-blur-sm border-2 border-gray-200 hover:bg-white text-gray-900 px-8 py-6 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full sm:w-auto"
                  >
                    <Image className="w-5 h-5 mr-2" />
                    NFT Card
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </StarBorder>
              </BlurText>
            </div>
          </div>
        </div>
      </section>

      {/* How it work Section */}
      <section id="how-it-works" className="py-5 px-6 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-12">
            How it work
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Payments subsection - clickable link to guide */}
            <Link to="/blog/zktls_payments_guide" className="block group">
              <Card className="bg-white shadow-lg rounded-2xl border-0 overflow-hidden transition-shadow hover:shadow-xl cursor-pointer h-full">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">Payments</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                  Payments via social identity. Send and receive funds using a social handle instead of wallet addresses. Access is proven with a zkTLS proof, and the payout is executed and verified on-chain - private and secure.
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* NFT subsection - clickable link to guide */}
            <Link to="/blog/nft_gift_cards_guide" className="block group">
              <Card className="bg-white shadow-lg rounded-2xl border-0 overflow-hidden transition-shadow hover:shadow-xl cursor-pointer h-full">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                      <Image className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">NFT</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                  Each card is an on-chain digital asset you can personalize with a message and amount. Recipients can claim it instantly - then spend or redeem the NFT card across compatible apps and services, wherever NFT gift cards are accepted.</p>
                </CardContent>
              </Card>
            </Link>
          </div>
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
                  <Link to="/blog" className="text-sm hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>


            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <p className="text-sm text-gray-400">
                <a href="https://x.com/Leonissx" target="_blank" rel="noopener noreferrer">
                  X: Leonissx
                </a>
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            © 2026 Sendly. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
