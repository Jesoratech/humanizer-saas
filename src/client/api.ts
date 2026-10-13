import type {
  HumanizeRequest,
  HumanizeResponse,
  UsageData,
  FeedbackRequest,
  ApiError,
} from '../shared/schemas';
import { supabase } from './supabase';

const API_BASE = '/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody: ApiError = await response.json().catch(() => ({
      error: `Request failed with status ${response.status}`,
      code: 'UNKNOWN_ERROR',
    }));
    throw new ApiClientError(
      errorBody.error || 'An unexpected error occurred',
      response.status,
      errorBody.code,
      errorBody.requestId
    );
  }
  return response.json();
}

export class ApiClientError extends Error {
  public status: number;
  public code: string;
  public requestId?: string;

  constructor(
    message: string,
    status: number,
    code: string,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export async function humanizeText(
  request: HumanizeRequest,
  signal?: AbortSignal
): Promise<HumanizeResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/humanize`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal,
  });

  return handleResponse<HumanizeResponse>(response);
}

export async function getUsage(): Promise<UsageData> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/usage`, {
    method: 'GET',
    headers,
  });

  return handleResponse<UsageData>(response);
}

export async function submitFeedback(
  request: FeedbackRequest
): Promise<{ success: boolean }> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  return handleResponse<{ success: boolean }>(response);
}

export async function getHealthStatus(): Promise<{
  status: string;
  modelEnabled: boolean;
}> {
  const response = await fetch('/api/health');
  return handleResponse(response);
}
