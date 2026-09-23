const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // If accessed from a mobile phone or another device on the network (not localhost),
    // automatically target that same device IP on port 3001
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${window.location.hostname}:3001/api/v1`;
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
