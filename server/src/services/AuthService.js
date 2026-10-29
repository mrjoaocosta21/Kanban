import { unauthorized } from '../http/HttpError.js';
import { verifyPassword } from '../security/password.js';
import { createSessionToken, hashSessionToken } from '../security/sessionToken.js';

const DUMMY_PASSWORD_HASH = 'scrypt$16384$8$1$cCeeFrOjSKv6B3VmvG2FcQ$Ef9H-UXe2tylqVLTePHB8rmwAC3a1KJWq7gMgIVc4Z0DdLb827HDUJoVwZvAAGzzds0Uvr6dUgFB_a2k69Cnaw';

export class AuthService {
  constructor(repository, { sessionTtlDays = 7 } = {}) {
    this.repository = repository;
    this.sessionTtlDays = sessionTtlDays;
  }

  async login(email, password) {
    const user = await this.repository.findUserByEmail(email);
    const passwordMatches = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw unauthorized('E-mail ou senha inválidos.');
    }

    const { token, tokenHash } = createSessionToken();
    const expiresAt = new Date(Date.now() + this.sessionTtlDays * 24 * 60 * 60 * 1000);

    await this.repository.createSession({ tokenHash, userId: user.id, expiresAt });
    const memberships = await this.repository.listMemberships(user.id);

    return {
      token,
      expiresAt,
      principal: {
        user: this.withoutPassword(user),
        memberships,
      },
    };
  }

  async authenticate(token) {
    if (!token) {
      return null;
    }

    return this.repository.findPrincipalBySessionHash(hashSessionToken(token));
  }

  async logout(token) {
    if (token) {
      await this.repository.deleteSession(hashSessionToken(token));
    }
  }

  withoutPassword(user) {
    const safeUser = { ...user };
    delete safeUser.passwordHash;
    return safeUser;
  }
}
