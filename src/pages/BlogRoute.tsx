import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, ArrowRight, Tag, Clock } from 'lucide-react';
import { BlogLayout } from '@/components/BlogLayout';

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  image?: string;
  readTime?: string;
}

const blogPosts: BlogPost[] = [
  {
    slug: 'privy_results',
    title: 'Privy testnet results: metrics, methodology, and takeaways',
    description:
      'Testnet metrics, the Privy + OAuth token workflow, how we verify data, and main practical takeaways.',
    date: '2026-02-10',
    category: 'Technology',
    tags: ['Privy', 'OAuth', 'Testnet'],
    readTime: '8 min',
    image: '/Sendly x Privy.png'
  },
  {
    slug: 'zktls_payments_guide',
    title: 'User Guide: Payments (zkTLS and zkSend)',
    description:
      'Discover our zkTLS technology: send and receive payments via social identity with proof of ownership - no data sharing.',
    date: '2026-02-11',
    category: 'Tutorial',
    tags: ['zkTLS', 'zkSend', 'Payments'],
    readTime: '10 min',
    image: '/SENDLY-ZKTLS.png'
  },
  {
    slug: 'nft_gift_cards_guide',
    title: 'NFT Gift Cards — User Guide',
    description: 'An NFT gift card is a digital card minted on-chain. Choose amount, add a message, send to a wallet or social username.',
    date: '2026-02-11',
    category: 'Tutorial',
    tags: ['NFT', 'Gift Cards', 'Tutorial'],
    readTime: '8 min',
    image: '/SENDLY GIFT CARD.png'
  }
];

const categories = ['All', 'Announcements', 'Features', 'Technology', 'Tutorial', 'Security'];

export function BlogRoute() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredPosts = selectedCategory === 'All'
    ? blogPosts
    : blogPosts.filter(post => post.category === selectedCategory);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <BlogLayout backLink={{ to: '/', label: '← Home' }}>
      {/* Blog Header */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
          Blog
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          News, updates and guides for Sendly
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === category
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Blog Posts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {filteredPosts.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="group"
          >
            <article className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col border border-gray-100">
              {/* Image or placeholder */}
              {post.image ? (
                <div className="w-full h-48 overflow-hidden bg-gray-100">
                  <img
                    src={encodeURI(post.image)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback on image loading error
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 flex items-center justify-center"><svg class="w-16 h-16 text-purple-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></div>';
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-purple-400 opacity-50" />
                </div>
              )}

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                {/* Meta info */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    {post.category}
                  </span>
                  {post.readTime && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                  {post.title}
                </h2>

                {/* Date */}
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(post.date)}
                </p>

                {/* Description */}
                <p className="text-gray-600 mb-4 line-clamp-3 flex-1">
                  {post.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md flex items-center gap-1"
                      >
                        <Tag className="w-2 h-2" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-purple-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filteredPosts.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">
            No posts in this category yet
          </p>
        </div>
      )}
    </BlogLayout>
  );
}
