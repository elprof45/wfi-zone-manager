import { RouterOsHttpError } from './errors';
import type { RouterPayload, RouterRecord, RouterResponse } from './types';

export interface RestClientOptions {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly https?: boolean;
  readonly timeoutMs?: number;
  readonly fetch?: typeof fetch;
}

export class RouterOsRestClient {
  private readonly baseUrl: string;
  private readonly authorization: string;
  private readonly requestTimeoutMs: number;
  private readonly fetcher: typeof fetch;

  constructor(options: RestClientOptions) {
    const scheme = options.https ? 'https' : 'http';
    this.baseUrl = `${scheme}://${options.host}:${options.port}/rest`;
    this.authorization = `Basic ${btoa(`${options.username}:${options.password}`)}`;
    this.requestTimeoutMs = options.timeoutMs ?? 10_000;
    this.fetcher = options.fetch ?? fetch;
  }

  async request<T extends RouterResponse = RouterResponse>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: RouterPayload,
  ): Promise<T> {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await this.fetcher(`${this.baseUrl}${normalizedEndpoint}`, {
      method,
      headers: { Authorization: this.authorization, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });
    const text = await response.text();
    let parsed: RouterResponse = text;
    try { parsed = text ? JSON.parse(text) as RouterResponse : null; } catch { /* RouterOS may return plain text. */ }
    if (!response.ok) {
      const message = response.status === 401
        ? 'Authentification REST RouterOS refusée.'
        : `Erreur REST RouterOS HTTP ${response.status}.`;
      throw new RouterOsHttpError(response.status, message, normalizedEndpoint, parsed);
    }
    return parsed as T;
  }

  list<T extends RouterRecord = RouterRecord>(endpoint: string): Promise<T[]> {
    return this.request<T[]>('GET', endpoint);
  }

  get<T extends RouterRecord = RouterRecord>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  create<T extends RouterRecord = RouterRecord>(endpoint: string, body: RouterPayload): Promise<T> {
    return this.request<T>('POST', endpoint, body);
  }

  update<T extends RouterRecord = RouterRecord>(endpoint: string, id: string, body: RouterPayload): Promise<T> {
    return this.request<T>('PATCH', `${endpoint}/${encodeURIComponent(id)}`, body);
  }

  remove(endpoint: string, id: string): Promise<RouterResponse> {
    return this.request('DELETE', `${endpoint}/${encodeURIComponent(id)}`);
  }

  async findOne<T extends RouterRecord = RouterRecord>(endpoint: string, field: string, value: string): Promise<T | undefined> {
    const query = `${encodeURIComponent(field)}=${encodeURIComponent(value)}`;
    return (await this.list<T>(`${endpoint}?${query}`))[0];
  }
}
