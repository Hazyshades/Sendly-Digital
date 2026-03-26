import { Layout } from '@/pages/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, MessageCircle, Shield, Zap, Users, CreditCard } from 'lucide-react';

export function FAQRoute() {
  const faqCategories = [
    {
      title: 'Getting Started',
      icon: Gift,
      questions: [
        {
          question: 'What is Sendly?',
          answer: 'Sendly is a platform for sending cryptocurrency gift cards by username on social networks. You can send USDC, EURC, or USYC to any user on Twitter, Twitch, Telegram, TikTok, or Instagram by simply entering their username, without needing to know the recipient\'s wallet address.'
        },
        {
          question: 'How does sending by username work?',
          answer: 'When you send a gift card by username, the funds are deposited into a special vault contract linked to that username. The recipient can log into the platform, authenticate through their social network, and claim the card. If the recipient doesn\'t have a wallet yet, the platform will automatically create a Internal wallet for them through Circle.'
        },
        {
          question: 'Which social networks are supported?',
          answer: 'Sendly supports sending gift cards by username on the following social networks: Twitter (X), Twitch, Telegram, TikTok, and Instagram. You can choose any of these platforms when creating a card.'
        },
        {
          question: 'Does the recipient need a wallet to receive a card?',
          answer: 'No! If the recipient doesn\'t have a wallet, the platform will automatically create a Internal wallet for them through Circle. The recipient only needs to authenticate through their social network, and they\'ll be able to claim the card.'
        }
      ]
    },
    {
      title: 'Creating & Sending',
      icon: CreditCard,
      questions: [
        {
          question: 'How do I create a gift card?',
          answer: 'Go to the "Create" page, select the recipient type (wallet address or social network username), specify the amount, currency (USDC, EURC, or USYC), add a message, and customize the card design. Then confirm the transaction in your wallet.'
        },
        {
          question: 'Which currencies are supported?',
          answer: 'Sendly supports three stablecoins: USDC (USD Coin), EURC (Euro Coin), and USYC. All operate on the ARC Testnet blockchain.'
        },
        {
          question: 'Can I send a card directly to a wallet address?',
          answer: 'Yes, you can choose to send to a wallet address directly or by social network username. When sending to an address, the card is created immediately, while sending by username stores it in a vault until the recipient claims it.'
        },
        {
          question: 'Can I add a personal message to the card?',
          answer: 'Yes, when creating a card, you can add a regular message visible to the recipient, as well as a secret message that can be password-protected.'
        },
        {
          question: 'Are there any amount limits?',
          answer: 'The minimum amount depends on the selected currency and network fees. It\'s recommended to send at least 1 unit of the selected currency to cover fees.'
        }
      ]
    },
    {
      title: 'Receiving Cards',
      icon: Zap,
      questions: [
        {
          question: 'How do I receive a card sent to me?',
          answer: 'Log into the platform through the social network by which the card was sent to you. Go to the "My Cards" section where you\'ll see all available cards. Click "Claim" to receive the card.'
        },
        {
          question: 'How do I know if someone sent me a card?',
          answer: 'If someone sent you a card by your social network username, it will be available in the "My Cards" section after authenticating through the corresponding social network. The sender may also notify you directly.'
        },
        {
          question: 'What if the card is password-protected?',
          answer: 'If the sender set a password on the card, you\'ll need to enter it when claiming. The password should be communicated to you separately by the sender.'
        },
        {
          question: 'Can I receive a card if I\'m not authenticated?',
          answer: 'No, to receive a card you must authenticate through the social network by which the card was sent. If you don\'t have an account on that network, contact the sender for an alternative way to receive it.'
        }
      ]
    },
    {
      title: 'Security',
      icon: Shield,
      questions: [
        {
          question: 'Is it safe to send cards by username?',
          answer: 'Yes, cards are stored in smart contracts on the ARC Testnet blockchain. Funds are protected by blockchain cryptography. Only the username owner (after authentication) can claim the card.'
        },
        {
          question: 'What happens if the recipient\'s username changes?',
          answer: 'Cards are linked to the specific username at the time of sending. If the username changes, cards sent to the old username will remain accessible when authenticating through the old account or may be transferred during system updates.'
        },
        {
          question: 'Can I cancel a sent card?',
          answer: 'No, blockchain transactions are irreversible. Once a card is created, it cannot be cancelled. Make sure the recipient\'s username is correct before sending.'
        },
        {
          question: 'Who has access to my funds?',
          answer: 'Only you have access to funds in your wallet. The platform does not store your private keys. When using a Internal wallet through Circle, keys are managed by Circle, but only the authenticated user has access to the funds.'
        }
      ]
    },
    {
      title: 'Technical Questions',
      icon: MessageCircle,
      questions: [
        {
          question: 'Which blockchain does Sendly run on?',
          answer: 'Sendly runs on the ARC Testnet blockchain. This is a test network, so the tokens used are test tokens and have no real value.'
        },
        {
          question: 'What fees are charged?',
          answer: 'The platform charges network fees (gas fees) for creating and claiming cards. Fees depend on network load and transaction complexity.'
        },
        {
          question: 'What is a Internal wallet?',
          answer: 'A Internal wallet is a wallet automatically created for users through Circle. It allows users to receive and manage cryptocurrency without needing to set up their own wallet manually.'
        },
        {
          question: 'Can I use my own wallet instead of a Internal wallet?',
          answer: 'Yes, you can connect your own wallet (e.g., MetaMask) to send cards and manage funds. Internal wallets are automatically created only for receiving cards if the user doesn\'t have a connected wallet.'
        },
        {
          question: 'What if a transaction gets stuck?',
          answer: 'If a transaction gets stuck, check its status in the "History" section. You can try increasing the gas fee or retrying the transaction. If the problem persists, contact support.'
        }
      ]
    },
    {
      title: 'Additional Features',
      icon: Users,
      questions: [
        {
          question: 'What is Voice Payment Agent?',
          answer: 'Voice Payment Agent is a feature that allows you to create and send cards using voice commands. You can simply say who to send to and how much, and the system will process the request.'
        },
        {
          question: 'What are Schedules?',
          answer: 'The scheduling feature allows you to set up automatic card sending at specific times. You can create schedules for regular payments or planned gifts.'
        },
        {
          question: 'What is Bridge?',
          answer: 'Bridge allows you to transfer tokens between different blockchains. You can transfer USDC from ARC Testnet to other networks and back.'
        },
        {
          question: 'What is Leaderboard?',
          answer: 'Leaderboard shows the most active users on the platform, sorted by the number of cards sent or received.'
        },
        {
          question: 'Can I view transaction history?',
          answer: 'Yes, in the "History" section you can view the complete history of creating, receiving, and using your cards.'
        }
      ]
    }
  ];

  return (
    <Layout>
      <div className="p-6 md:p-12 space-y-8">
        <div className="text-center space-y-4 mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about Sendly and sending gift cards by username
          </p>
        </div>

        <div className="space-y-8">
          {faqCategories.map((category, categoryIndex) => {
            const IconComponent = category.icon;
            return (
              <Card key={categoryIndex} className="bg-white shadow-lg rounded-2xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, itemIndex) => (
                      <AccordionItem
                        key={itemIndex}
                        value={`item-${categoryIndex}-${itemIndex}`}
                        className="border-b last:border-b-0"
                      >
                        <AccordionTrigger className="text-left font-semibold text-gray-900 hover:text-blue-600 py-4">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-700 leading-relaxed pb-4">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl rounded-2xl border-0 overflow-hidden mt-12">
          <CardContent className="p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
            <p className="text-blue-100 mb-6">
              Contact us and we'll help you figure it out
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://x.com/Leonissx"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Contact on Twitter
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
