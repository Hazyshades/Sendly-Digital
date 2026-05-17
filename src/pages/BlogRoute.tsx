import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, ArrowRight, Tag, Clock } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { BlogLayout } from '@/components/BlogLayout';
import { BlogEngagementBar } from '@/components/blog/BlogEngagementBar';
import { BLOG_POSTS, PUBLIC_BLOG_SLUGS } from '@/lib/blog/posts';

const categories = ['All', 'Announcements', 'Features', 'Technology', 'Tutorial', 'Security'];

const visibleBlogPosts = BLOG_POSTS.filter((post) => PUBLIC_BLOG_SLUGS.has(post.slug));

export function BlogRoute() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredPosts =
    selectedCategory === 'All'
      ? visibleBlogPosts
      : visibleBlogPosts.filter((post) => post.category === selectedCategory);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <BlogLayout backLink={{ to: '/', label: '← Home' }}>
      <Helmet>
        <title>Blog | Sendly</title>
        <meta name="description" content="Release notes, how-tos, and product writeups from Sendly." />
      </Helmet>
      <div className="blog-index-typography">
        <div className="text-center mb-6">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">Blog</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Release notes, how-tos, and product writeups
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {filteredPosts.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="group">
              <article className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col border border-gray-100">
                {post.coverImage ? (
                  <div className="w-full h-48 overflow-hidden bg-gray-100">
                    <img
                      src={encodeURI(post.coverImage)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-purple-400 opacity-50" />
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col">
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

                  <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {post.title}
                  </h2>

                  <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(post.date)}
                  </p>

                  <p className="text-gray-600 mb-4 line-clamp-3 flex-1">{post.description}</p>

                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <BlogEngagementBar slug={post.slug} compact />
                    <div className="flex items-center justify-between">
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
                </div>
              </article>
            </Link>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">No posts in this category yet</p>
          </div>
        )}
      </div>
    </BlogLayout>
  );
}
