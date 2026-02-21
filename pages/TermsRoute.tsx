import { Link, useNavigate } from 'react-router-dom';
import { Gift, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

export function TermsRoute() {
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
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Terms of Service</h1>
                <div className="space-y-4 text-gray-700">
                  <section>
                    <p>
                      By using Sendly, you agree to these terms. The service allows you to create and send gift cards on the blockchain.
                    </p>
                  </section>
                  
                  <section>
                    <p>
                      You are responsible for your account and all transactions. Blockchain transactions are final and cannot be reversed.
                    </p>
                  </section>
                  
                  <section>
                    <p>
                      We may update these terms at any time. Continued use of the service means you accept the updated terms.
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




