import { getAccessToken, getApiBase } from "./api";

export interface SSEMessage<T = unknown> {
  event?: string;
  data: T;
}

export interface SSEClient<T = unknown> {
  close: () => void;
}

export function createSSEClient<T = unknown>(
  path: string,
  onMessage: (data: T) => void,
  onError?: (err: Event) => void,
): SSEClient<T> {
  const token = getAccessToken();
  const url = new URL(`${getApiBase()}${path}`);

  const es = new EventSource(url.toString(), {
    // EventSource doesn't support custom headers natively; pass token as query
  } as EventSourceInit);

  // If token exists, we can't set Authorization header on EventSource,
  // so pass it as a query param for SSE endpoints that check it.
  if (token) {
    url.searchParams.set("token", token);
  }

  const source = new EventSource(url.toString());

  source.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data) as T;
      onMessage(data);
    } catch {
      onMessage(ev.data as unknown as T);
    }
  };

  source.onerror = (ev) => {
    if (onError) onError(ev);
  };

  es.close();

  return {
    close: () => {
      source.close();
    },
  };
}

export function createPollingClient<T>(
  fetcher: () => Promise<T>,
  onData: (data: T) => void,
  intervalMs = 2000,
): { stop: () => void } {
  let active = true;
  let timer: ReturnType<typeof setTimeout>;

  const tick = async () => {
    if (!active) return;
    try {
      const data = await fetcher();
      if (active) onData(data);
    } catch {
      // ignore polling errors
    }
    if (active) {
      timer = setTimeout(tick, intervalMs);
    }
  };

  timer = setTimeout(tick, 0);
  return {
    stop: () => {
      active = false;
      clearTimeout(timer);
    },
  };
}
