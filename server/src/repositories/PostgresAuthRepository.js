function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.job_title,
    initials: row.initials,
    avatarUrl: row.avatar_url,
  };
}

function mapMembership(row) {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    workspaceSlug: row.workspace_slug,
    userId: row.user_id,
    role: row.role,
  };
}

export class PostgresAuthRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findUserByEmail(email) {
    const { rows } = await this.pool.query(`
      SELECT id, email, name, job_title, initials, avatar_url, password_hash
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `, [email]);

    if (!rows[0]) {
      return null;
    }

    return { ...mapUser(rows[0]), passwordHash: rows[0].password_hash };
  }

  async createSession({ tokenHash, userId, expiresAt }) {
    await this.pool.query(`
      INSERT INTO sessions (token_hash, user_id, expires_at)
      VALUES ($1, $2, $3)
    `, [tokenHash, userId, expiresAt]);
  }

  async findPrincipalBySessionHash(tokenHash) {
    const { rows } = await this.pool.query(`
      SELECT u.id, u.email, u.name, u.job_title, u.initials, u.avatar_url
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > NOW()
      LIMIT 1
    `, [tokenHash]);

    if (!rows[0]) {
      return null;
    }

    const user = mapUser(rows[0]);
    const memberships = await this.listMemberships(user.id);

    await this.pool.query(
      'UPDATE sessions SET last_seen_at = NOW() WHERE token_hash = $1',
      [tokenHash],
    );

    return { user, memberships };
  }

  async listMemberships(userId) {
    const { rows } = await this.pool.query(`
      SELECT wm.workspace_id, w.name AS workspace_name, w.slug AS workspace_slug,
             wm.user_id, wm.role
      FROM workspace_members wm
      JOIN workspaces w ON w.id = wm.workspace_id
      WHERE wm.user_id = $1
      ORDER BY wm.joined_at
    `, [userId]);

    return rows.map(mapMembership);
  }

  async deleteSession(tokenHash) {
    await this.pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }

  async deleteExpiredSessions() {
    await this.pool.query('DELETE FROM sessions WHERE expires_at <= NOW()');
  }
}
