'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isResolved: boolean;
  isPrivate: boolean;
  viewCount: number;
  author: {
    fullName: string;
    role: string;
  };
  category: {
    name: string;
    icon: string;
  };
  _count?: {
    replies: number;
  };
}

export default function ForumPage() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showResolved, setShowResolved] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, showResolved]);

  async function fetchPosts() {
    try {
      setLoading(true);
      let url = '/api/posts?';
      if (selectedCategory) url += `category=${selectedCategory}&`;
      if (!showResolved) url += 'resolved=false&';
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchPosts();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Discussion Forum</h1>
              <p className="mt-1 text-sm text-gray-600">
                Ask questions and share knowledge about Return to Work coordination
              </p>
            </div>
            <Link
              href="/forum/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Post
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="mt-6 bg-white rounded-lg shadow p-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="temporary">Temporary Restrictions</option>
                  <option value="permanent">Permanent Restrictions</option>
                  <option value="industrial">Industrial Cases</option>
                  <option value="non-industrial">Non-Industrial Cases</option>
                  <option value="bridge">Bridge Assignments</option>
                  <option value="compliance">ADA/FEHA Compliance</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showResolved"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showResolved" className="ml-2 text-sm text-gray-700">
                  Show resolved
                </label>
              </div>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Search
              </button>
            </form>
          </div>

          {/* Posts List */}
          <div className="mt-6">
            {loading ? (
              <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
                Loading discussions...
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No discussions found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new post.
                </p>
                <div className="mt-6">
                  <Link
                    href="/forum/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create New Post
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {posts.map((post) => (
                    <li key={post.id}>
                      <Link href={`/forum/posts/${post.id}`} className="block hover:bg-gray-50">
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0 flex-1">
                              <span className="text-2xl mr-3">{post.category?.icon || '📋'}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-blue-600 truncate">
                                  {post.title}
                                </p>
                                <p className="text-sm text-gray-500 truncate mt-1">
                                  {post.content.substring(0, 150)}
                                  {post.content.length > 150 ? '...' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                              {post.isResolved && (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Resolved
                                </span>
                              )}
                              {post.isPrivate && (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Private
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center">
                                <svg className="mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                {post.author?.fullName}
                              </span>
                              <span className="flex items-center">
                                <svg className="mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                {post._count?.replies || 0} replies
                              </span>
                              <span className="flex items-center">
                                <svg className="mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {post.viewCount}
                              </span>
                            </div>
                            <span className="text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
