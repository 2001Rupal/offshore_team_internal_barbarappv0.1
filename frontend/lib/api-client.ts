const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;

    // 1. Local development (use 127.0.0.1 to avoid Windows IPv6 ::1 ECONNREFUSED)
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:3001/api/v1';
    }

    // 2. Mobile LAN testing (192.168.x.x, 10.x.x.x, 172.x)
    if (
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.')
    ) {
      return `${window.location.protocol}//${host}:3001/api/v1`;
    }

    // 3. Live production deployments (Vercel, Render, custom domains) -> Live Render backend
    return 'https://barber-backend-91hy.onrender.com/api/v1';
  }

  // Server-side rendering (SSR) fallback
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost') && !process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1')) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'https://barber-backend-91hy.onrender.com/api/v1';
};

export class ApiErrorResponse extends Error {
  statusCode: number;
  error: string;
  messages: string[];

  constructor(statusCode: number, error: string, messages: string[]) {
    super(messages.join(', '));
    this.name = 'ApiErrorResponse';
    this.statusCode = statusCode;
    this.error = error;
    this.messages = messages;
  }
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('barber_token', token);
    } else {
      localStorage.removeItem('barber_token');
    }
  }
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('barber_token');
  }
  return authToken;
};

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${getApiUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Abort request after 15 seconds to prevent indefinite hangs during server wake-ups
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText || 'Request failed' };
      }

      const messages = Array.isArray(errorData.message)
        ? errorData.message
        : [errorData.message || 'An unexpected error occurred'];

      throw new ApiErrorResponse(
        response.status,
        errorData.error || 'API Error',
        messages,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new ApiErrorResponse(504, 'Gateway Timeout', [
        'The server is warming up from sleep. Please try again in a few seconds.',
      ]);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
