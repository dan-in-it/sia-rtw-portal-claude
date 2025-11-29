'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function NewEscalationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get('postId');

  const [escalationType, setEscalationType] = useState<'LIAISON' | 'LEGAL'>('LIAISON');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/escalations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: postId || undefined,
          escalationType,
          priority,
          description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/escalations/${data.id}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create escalation');
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

      <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create Escalation</h1>
            <p className="mt-1 text-sm text-gray-600">
              Escalate this issue to an expert for assistance
            </p>
          </div>

          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Escalation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escalate To <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="escalationType"
                      value="LIAISON"
                      checked={escalationType === 'LIAISON'}
                      onChange={(e) => setEscalationType('LIAISON')}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">RTW Liaison</div>
                      <div className="text-sm text-gray-500">
                        For general RTW coordination questions, bridge assignments, and accommodation strategies
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="escalationType"
                      value="LEGAL"
                      checked={escalationType === 'LEGAL'}
                      onChange={(e) => setEscalationType('LEGAL')}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">Legal Counsel</div>
                      <div className="text-sm text-gray-500">
                        For ADA/FEHA compliance questions, legal interpretations, and complex legal matters
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Priority Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LOW">Low - General inquiry, no time pressure</option>
                  <option value="MEDIUM">Medium - Important but not time-sensitive</option>
                  <option value="HIGH">High - Time-sensitive issue</option>
                  <option value="URGENT">Urgent - Immediate attention required</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  required
                  minLength={10}
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide detailed information about the issue you need help with..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Include all relevant details, dates, and any steps you've already taken
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">What happens next?</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>An expert will be notified via email</li>
                        <li>You'll receive a response within the SLA timeframe</li>
                        <li>You can track the escalation status on your dashboard</li>
                        <li>Updates will be sent to your email</li>
                      </ul>
                    </div>
                  </div>
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
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
