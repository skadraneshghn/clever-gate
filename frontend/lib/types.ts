export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  first_name: string | null;
  last_name: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface Provider {
  id: string;
  name: string;
  adapter_type: string;
  base_url: string | null;
  config: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deployment {
  id: string;
  provider_id: string;
  model_name: string;
  litellm_model: string;
  litellm_params: Record<string, unknown>;
  tpm: number | null;
  rpm: number | null;
  context_window: number | null;
  is_enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderKey {
  id: string;
  provider_id: string;
  label: string;
  key_prefix: string;
  is_enabled: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  key_prefix: string;
  name: string | null;
  user_id: string;
  team_id: string | null;
  allowed_models: string[] | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}

export interface DashboardMetrics {
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  cache_hit_rate: number;
  active_keys: number;
  error_rate: number;
  rps: number;
  avg_latency_ms: number;
}

export interface ProviderHealthItem {
  deployment_id: string;
  model_name: string;
  is_open: boolean;
  fails: number;
  cooldown_remaining: number;
}

export interface RequestLog {
  id: string;
  request_id: string;
  api_key_id: string | null;
  user_id: string | null;
  model: string | null;
  deployment_id: string | null;
  provider_id: string | null;
  is_stream: boolean | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number | null;
  status_code: number | null;
  error_class: string | null;
  cache_hit: boolean;
  created_at: string | null;
}

export interface SpendRecord {
  id: string;
  request_log_id: string;
  user_id: string | null;
  team_id: string | null;
  provider_id: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost_usd: number | null;
  created_at: string | null;
}

export interface CacheStats {
  total_entries: number;
  total_hits: number;
}

export interface Setting {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
}

export interface Paginated<T> {
  items: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  message: string;
  type?: string;
  code?: string;
}
