import type {
  HumanizeRequest,
  HumanizeResponse,
  UsageData,
  FeedbackRequest,
  ApiError,
  UserProfile,
  AdminSystemMetrics,
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

  // Also include user metadata if stored in localStorage for dev / demo admin access
  const localUserStr = localStorage.getItem('humanly_current_user');
  if (localUserStr) {
    try {
      const localUser = JSON.parse(localUserStr);
      if (localUser.id) headers['x-user-id'] = localUser.id;
      if (localUser.email) headers['x-user-email'] = localUser.email;
      if (localUser.role === 'admin' || localUser.email === 'rajan102805@gmail.com') {
        headers['x-admin-key'] = 'humanly-super-admin';
      }
    } catch {
      // Ignore
    }
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

export async function getUserProfile(): Promise<{ profile: UserProfile; usage: UsageData }> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/user/profile`, {
    method: 'GET',
    headers,
  });

  return handleResponse<{ profile: UserProfile; usage: UsageData }>(response);
}

export async function subscribeToPlan(
  planId: 'premium_monthly' | 'premium_yearly'
): Promise<{ success: boolean; message: string; profile: UserProfile }> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/subscribe`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ planId }),
  });

  return handleResponse<{ success: boolean; message: string; profile: UserProfile }>(response);
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
  activeModel?: string;
}> {
  const response = await fetch('/api/health');
  return handleResponse(response);
}

// ── Admin API Endpoints ──

export async function getAdminMetrics(): Promise<AdminSystemMetrics> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/admin/metrics', { headers });
  return handleResponse<AdminSystemMetrics>(response);
}

export async function getAdminUsers(): Promise<{ users: UserProfile[] }> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/admin/users', { headers });
  return handleResponse<{ users: UserProfile[] }>(response);
}

export async function updateAdminUserPlan(
  userId: string,
  tier: string
): Promise<{ success: boolean; user: UserProfile }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/plan`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tier }),
  });
  return handleResponse<{ success: boolean; user: UserProfile }>(response);
}

export async function updateAdminUserStatus(
  userId: string,
  status: 'active' | 'suspended'
): Promise<{ success: boolean; user: UserProfile }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ status }),
  });
  return handleResponse<{ success: boolean; user: UserProfile }>(response);
}

export async function resetAdminUserUsage(
  userId: string
): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/reset`, {
    method: 'POST',
    headers,
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

export async function updateAdminSystemSettings(settings: {
  maintenanceMode?: boolean;
  activeModel?: string;
  stealthEncodingEnabled?: boolean;
}): Promise<{ success: boolean; config: unknown }> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/admin/system', {
    method: 'POST',
    headers,
    body: JSON.stringify(settings),
  });
  return handleResponse<{ success: boolean; config: unknown }>(response);
}
