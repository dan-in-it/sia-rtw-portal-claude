'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to fetch and manage CSRF token
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchToken();
  }, []);

  const fetchToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/csrf-token');
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data = await response.json();
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching CSRF token:', err);
    } finally {
      setLoading(false);
    }
  };

  return { token, loading, error, refetch: fetchToken };
}

/**
 * Add CSRF token to fetch request headers
 */
export function addCsrfToken(
  headers: HeadersInit = {},
  token: string | null
): HeadersInit {
  if (!token) return headers;

  return {
    ...headers,
    'x-csrf-token': token,
  };
}
