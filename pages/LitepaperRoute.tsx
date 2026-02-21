import { Layout } from './Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Gift, 
  Send, 
  Shield, 
  Zap, 
  Users, 
  Globe, 
  Lock, 
  ArrowRight,
  Code,
  Wallet,
  MessageCircle,
  Sparkles
} from 'lucide-react';

export function LitepaperRoute() {
  return (
    <Layout>
      <div className="p-6 md:p-12 space-y-12">
        {/* Header */}
        <div className="text-center space-y-6 mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl">
              <Gift className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
            Sendly Litepaper
          </h1>
          <p className="text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Sending cryptocurrency gift cards by username on social networks
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              ARC Testnet
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              Circle Wallets
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              Social Payments
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              Web3
            </Badge>
          </div>
        </div>

        {/* Executive Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-3xl">
              <Sparkles className="w-8 h-8 text-blue-600" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-lg text-gray-700 leading-relaxed">
            <p>
              <strong>Sendly</strong> is a decentralized platform for sending cryptocurrency gift cards 
              by usernames on social networks. The platform eliminates the main barrier to Web3 entry - 
              the need to know the recipient's wallet address.
            </p>
            <p>
              Using <strong>Circle Internal wallets</strong> technology and smart contracts on the 
              <strong> ARC Testnet</strong> blockchain, Sendly allows sending stablecoins (USDC, EURC, USYC) 
              to any user on Twitter, Twitch, Telegram, TikTok, or Instagram by simply entering their username.
            </p>
            <p>
              Recipients don't need a wallet - the platform automatically creates one when they first claim a card, 
              making cryptocurrency payments accessible to everyone.
            </p>
          </CardContent>
        </Card>

        {/* Problem Statement */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-blue-600" />
            The Problem
          </h2>
          <Card className="bg-white shadow-lg rounded-2xl border-0">
            <CardContent className="p-8 space-y-4 text-gray-700">
              <p className="text-lg">
                Traditional cryptocurrency payments require knowledge of long wallet addresses (0x...), 
                which creates significant barriers to mass adoption:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Complexity for beginners - need to understand wallet addresses</li>
                <li>Error risk - wrong address means irreversible loss of funds</li>
                <li>No connection to social networks - no way to send cryptocurrency by familiar username</li>
                <li>Requirement for recipient to set up a wallet beforehand</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Solution */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Zap className="w-8 h-8 text-purple-600" />
            The Solution
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Send className="w-6 h-6 text-blue-600" />
                  Send by Username
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-700">
                <p>
                  Send cryptocurrency using usernames from social networks instead of wallet addresses. 
                  Simply enter @username, and the platform will find or create a wallet for the recipient.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Wallet className="w-6 h-6 text-purple-600" />
                  Automatic Wallets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-700">
                <p>
                  Circle Internal wallets are automatically created for users when they first claim a card. 
                  Recipients don't need to set up MetaMask or other wallets.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-green-600" />
                  Secure Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-700">
                <p>
                  Funds are stored in smart contracts on the ARC Testnet blockchain. Cards are linked to usernames 
                  through a system of vault contracts, ensuring security and transparency.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Globe className="w-6 h-6 text-blue-600" />
                  Multi-Platform
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-700">
                <p>
                  Support for five major social networks: Twitter, Twitch, Telegram, TikTok, and Instagram. 
                  Unified interface for all platforms.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Code className="w-8 h-8 text-blue-600" />
            How It Works
          </h2>
          <Card className="bg-white shadow-lg rounded-2xl border-0">
            <CardContent className="p-8">
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Card Creation</h3>
                    <p className="text-gray-700">
                      The sender selects a social network and enters the recipient's username, amount, currency (USDC/EURC/USYC) 
                      and optional message. Funds are deposited into a vault smart contract linked to the username.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Vault Storage</h3>
                    <p className="text-gray-700">
                      The card is stored in a specialized vault contract for the selected social network 
                      (TwitterCardVault, TwitchCardVault, etc.). Funds are locked until the recipient claims the card.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Recipient Authentication</h3>
                    <p className="text-gray-700">
                      The recipient authenticates on the platform through their social network (OAuth). The platform verifies 
                      the username match and displays available cards.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Wallet Creation</h3>
                    <p className="text-gray-700">
                      If the recipient doesn't have a wallet, the platform automatically creates a Circle Internal wallet, 
                      linked to their social account. The process is completely transparent to the user.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Card Claiming</h3>
                    <p className="text-gray-700">
                      The recipient clicks "Claim" on the card, and funds are transferred from the vault to their wallet. 
                      The card becomes an NFT (ERC-721) that can be spent or saved.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Technology Stack */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Code className="w-8 h-8 text-purple-600" />
            Technology Stack
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle>Blockchain</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-gray-700">
                <p><strong>ARC Testnet</strong> - test network for development and testing</p>
                <p><strong>Ethereum-compatible</strong> - support for standard protocols (ERC-20, ERC-721)</p>
                <p><strong>Low fees</strong> - optimized network for micropayments</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle>Wallets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-gray-700">
                <p><strong>Circle Internal wallets</strong> - automatic wallet creation</p>
                <p><strong>MetaMask</strong> - support for traditional wallets</p>
                <p><strong>Privy</strong> - social authentication</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle>Smart Contracts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-gray-700">
                <p><strong>GiftCard.sol</strong> - main contract for creating cards (ERC-721)</p>
                <p><strong>Vault contracts</strong> - storing cards by social networks</p>
                <p><strong>OpenZeppelin</strong> - audited security libraries</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-gray-700">
                <p><strong>OAuth 2.0</strong> - authentication through social networks</p>
                <p><strong>Circle API</strong> - wallet and transaction management</p>
                <p><strong>Supabase</strong> - database and edge functions</p>
                <p><strong>Pinata</strong> - decentralized metadata storage</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-600" />
            Key Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  Send by Username
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p>Send cards using usernames from Twitter, Twitch, Telegram, TikTok, and Instagram</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Automatic Wallets
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p>Circle Internal wallets are automatically created for new users</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-green-600" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p>Funds are protected by smart contracts and blockchain cryptography</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-0 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-yellow-600" />
                  Personal Messages
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p>Add messages and secret notes to cards</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-0 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-pink-600" />
                  Voice Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p>Voice Payment Agent for creating cards with voice commands</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-0 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  Bridge
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p>Transfer tokens between different blockchains</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Token Economics */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-600" />
            Supported Tokens
          </h2>
          <Card className="bg-white shadow-lg rounded-2xl border-0">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-xl">
                  <h3 className="text-2xl font-bold text-blue-600 mb-2">USDC</h3>
                  <p className="text-gray-700">USD Coin - stablecoin pegged to the US dollar</p>
                </div>
                <div className="text-center p-6 bg-purple-50 rounded-xl">
                  <h3 className="text-2xl font-bold text-purple-600 mb-2">EURC</h3>
                  <p className="text-gray-700">Euro Coin - stablecoin pegged to the euro</p>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-xl">
                  <h3 className="text-2xl font-bold text-green-600 mb-2">USYC</h3>
                  <p className="text-gray-700">Additional stablecoin on ARC Testnet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Use Cases */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600" />
            Use Cases
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle>Content Creators</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p>Receive donations from followers directly in cryptocurrency using your social network username</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle>Social Payments</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p>Send gifts to friends and acquaintances on social networks without needing to know their wallet addresses</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle>Micropayments</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p>Fast and cheap transfers for tips, rewards, and small payments</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle>Corporate Payouts</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p>Automated payouts to employees and partners via their social accounts</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Roadmap */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ArrowRight className="w-8 h-8 text-blue-600" />
            Roadmap
          </h2>
          <Card className="bg-white shadow-lg rounded-2xl border-0">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-blue-600 rounded-full mt-2"></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">Current Version</h3>
                    <p className="text-gray-700">Support for 5 social networks, automatic wallets, voice payments, scheduling</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-gray-300 rounded-full mt-2"></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">Future Updates</h3>
                    <p className="text-gray-700">Expansion to other social networks, NFT integration, support for additional blockchains, mobile app</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl rounded-2xl border-0 overflow-hidden">
          <CardContent className="p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join Sendly and start sending cryptocurrency gift cards by username today
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/create"
                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
              >
                Create Card
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="/faq"
                className="bg-white/20 text-white hover:bg-white/30 px-8 py-4 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm"
              >
                Read FAQ
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
