export class ApiError extends Error {
  constructor(message, { status, code, requestId, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export class ApiClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async request(path, { method = 'GET', body, signal } = {}) {
    let response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        credentials: 'include',
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw error;
      }

      throw new ApiError('Não foi possível conectar ao servidor.', {
        code: 'NETWORK_ERROR',
        details: { cause: error instanceof Error ? error.message : String(error) },
      });
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : null;

    if (!response.ok) {
      throw new ApiError(
        payload?.error?.message ?? `O servidor respondeu com status ${response.status}.`,
        {
          status: response.status,
          code: payload?.error?.code ?? 'HTTP_ERROR',
          requestId: payload?.error?.requestId,
          details: payload?.error?.details,
        },
      );
    }

    return payload;
  }
}

export const apiClient = new ApiClient(import.meta.env?.VITE_API_URL || '/api');
