const getApiUrl = () => {
  // If explicitly configured with a non-localhost URL in environment, use it
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // When running on Vercel (or any non-local public domain), always point to the live Render backend
    if (
      host.includes('vercel.app') ||
      (host !== 'localhost' &&
        host !== '127.0.0.1' &&
        !host.startsWith('192.168.') &&
        !host.startsWith('10.') &&
        !host.startsWith('172.'))
    ) {
      return 'https://barber-backend-91hy.onrender.com/api/v1';
    }

    // If accessed from a mobile phone on the local network (192.168.x, 10.x, 172.x),
    // target that same local IP on port 3001
    const isLanIp =
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.');
    if (isLanIp) {
      return `${window.location.protocol}//${host}:3001/api/v1`;
    }
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:3001/api/v1';
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

  const response = await fetch(url, {
    ...options,
    headers,
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
}
