import { Link, useNavigate } from 'react-router-dom';
import { Gift, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PrivacyRoute() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#DADEFF' }}>
      <div className="abstract-shape"></div>
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-400 rounded-2xl flex items-center justify-center cursor-pointer shadow-circle-card">
                <Gift className="w-7 h-7 text-white" />
              </div>
              <span className="text-gray-900 text-2xl font-semibold">Sendly</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="min-h-screen flex items-center justify-center pt-16 pb-12 px-6 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-4">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="bg-white/90 backdrop-blur-sm border border-gray-200 hover:bg-white text-gray-900 px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-circle-card"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
          <Card className="bg-white shadow-xl rounded-2xl border-0 overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="space-y-6">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Privacy Policy</h1>
                <div className="space-y-4 text-gray-700">
                  <section>
                    <p>
                      We collect information you provide when using Sendly, such as wallet addresses and account information.
                    </p>
                  </section>
                  
                  <section>
                    <p>
                      We use this information to provide and improve our services. Blockchain transactions are public and visible on the blockchain.
                    </p>
                  </section>
                  
                  <section>
                    <p>
                      We use third-party services for authentication. These services may collect information according to their own privacy policies.
                    </p>
                  </section>
                  
                  <section>
                    <p>
                      We protect your information with security measures, but no method is 100% secure. You can contact us to update or delete your information.
                    </p>
                  </section>
                  
                  <section>
                    <p>
                      We may update this policy from time to time. Changes will be posted on this page.
                    </p>
                  </section>
                  
                  <section>
                    <p className="text-sm text-gray-500 mt-6">
                      Last updated: {new Date().toLocaleDateString()}
                    </p>
                  </section>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}




