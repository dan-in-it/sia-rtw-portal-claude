'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  author: {
    fullName: string;
    role: string;
  };
}

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isResolved: boolean;
  isPrivate: boolean;
  viewCount: number;
  author: {
    id: string;
    fullName: string;
    role: string;
  };
  category: {
    name: string;
    icon: string;
  };
  replies: Reply[];
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchPost();
    }
  }, [params.id]);

  async function fetchPost() {
    try {
      const res = await fetch(`/api/posts/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data);
      } else if (res.status === 404) {
        setError('Post not found');
      } else {
        setError('Failed to load post');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/posts/${params.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: replyContent,
        }),
      });

      if (res.ok) {
        setReplyContent('');
        fetchPost(); // Refresh post to show new reply
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to post reply');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkResolved() {
    try {
      const res = await fetch(`/api/posts/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isResolved: !post?.isResolved,
        }),
      });

      if (res.ok) {
        fetchPost();
      }
    } catch (err) {
      console.error('Failed to update post:', err);
    }
  }

  async function handleEscalate() {
    router.push(`/escalations/new?postId=${params.id}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto py-12 text-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto py-12 text-center">
          <div className="text-red-600">{error || 'Post not found'}</div>
          <Link href="/forum" className="mt-4 text-blue-600 hover:text-blue-500">
            ← Back to forum
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = session?.user?.id === post.author.id;
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Breadcrumb */}
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href="/forum" className="text-gray-500 hover:text-gray-700">
                  Forum
                </Link>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li className="text-gray-700">Discussion</li>
            </ol>
          </nav>

          {/* Post */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-3xl">{post.category.icon}</span>
                    <span className="text-sm text-gray-500">{post.category.name}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <svg className="mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      {post.author.fullName}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {post.author.role}
                    </span>
                    <span>{new Date(post.createdAt).toLocaleString()}</span>
                    <span className="flex items-center">
                      <svg className="mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {post.viewCount}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {post.isResolved && (
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                      Resolved
                    </span>
                  )}
                  {post.isPrivate && (
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
                      Private
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {post.content}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {(isAuthor || isAdmin) && (
                  <button
                    onClick={handleMarkResolved}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {post.isResolved ? 'Mark as Unresolved' : 'Mark as Resolved'}
                  </button>
                )}
                <button
                  onClick={handleEscalate}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Escalate to Expert
                </button>
              </div>
              <span className="text-sm text-gray-500">
                {post.replies?.length || 0} replies
              </span>
            </div>
          </div>

          {/* Replies */}
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Replies ({post.replies?.length || 0})
            </h2>

            <div className="space-y-4">
              {post.replies?.map((reply) => (
                <div key={reply.id} className="bg-white shadow rounded-lg px-6 py-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">{reply.author.fullName}</span>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {reply.author.role}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(reply.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-gray-700 whitespace-pre-wrap">{reply.content}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reply Form */}
          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Post a Reply</h3>
            <form onSubmit={handleReplySubmit}>
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Share your thoughts, answer, or additional questions..."
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !replyContent.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
