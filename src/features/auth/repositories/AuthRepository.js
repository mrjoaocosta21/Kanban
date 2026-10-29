import { apiClient } from '../../../shared/api/apiClient.js';

export class AuthRepository {
  constructor(client = apiClient) {
    this.client = client;
  }

  getSession(signal) {
    return this.client.request('/auth/session', { signal });
  }

  login(credentials) {
    return this.client.request('/auth/login', { method: 'POST', body: credentials });
  }

  logout() {
    return this.client.request('/auth/logout', { method: 'POST' });
  }

  listMembers(workspaceId, signal) {
    return this.client.request(`/workspaces/${encodeURIComponent(workspaceId)}/members`, { signal });
  }
}

export const authRepository = new AuthRepository();
