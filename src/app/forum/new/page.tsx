'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export default function NewPostPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // For now, we'll use hardcoded categories
    // In production, fetch from /api/categories
    setCategories([
      {
        id: '1',
        name: 'Temporary Work Restrictions',
        description: 'Questions about temporary restrictions and accommodations',
        icon: '⏰',
      },
      {
        id: '2',
        name: 'Permanent Work Restrictions',
        description: 'Discussions on permanent restrictions and long-term accommodations',
        icon: '📋',
      },
      {
        id: '3',
        name: 'Industrial Cases',
        description: "Work-related injury cases and workers' compensation",
        icon: '🏭',
      },
      {
        id: '4',
        name: 'Non-Industrial Cases',
        description: 'Non-work-related medical conditions and accommodations',
        icon: '🏥',
      },
      {
        id: '5',
        name: 'Bridge Assignments',
        description: 'Temporary alternative work assignments',
        icon: '🌉',
      },
      {
        id: '6',
        name: 'ADA/FEHA Compliance',
        description: 'Legal compliance questions and guidance',
        icon: '⚖️',
      },
    ]);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          categoryId,
          isPrivate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/forum/posts/${data.id}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create post');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create New Discussion</h1>
            <p className="mt-1 text-sm text-gray-600">
              Share your question or scenario with the community
            </p>
          </div>

          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Category Selection */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Choose the category that best fits your question
                </p>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  minLength={5}
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., How to handle temporary restrictions for office workers?"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {title.length}/200 characters
                </p>
              </div>

              {/* Content */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  required
                  minLength={10}
                  rows={12}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide details about your question or scenario. Include relevant context such as job classification, type of restriction, timeline, etc."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Be specific and include relevant details to get the best answers
                </p>
              </div>

              {/* Privacy Setting */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="isPrivate"
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isPrivate" className="font-medium text-gray-700">
                    Make this post private
                  </label>
                  <p className="text-gray-500">
                    Only you and administrators will be able to view this post
                  </p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Post'}
                </button>
              </div>
            </form>
          </div>

          {/* Tips Section */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Tips for getting great answers
            </h3>
            <ul className="mt-2 text-sm text-blue-700 space-y-1 ml-7">
              <li>• Be specific about the situation and context</li>
              <li>• Include relevant details like job classification and restriction type</li>
              <li>• Avoid including personal identifying information</li>
              <li>• Search existing posts to see if your question has been answered</li>
              <li>• Consider using the AI Assistant for quick general guidance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
