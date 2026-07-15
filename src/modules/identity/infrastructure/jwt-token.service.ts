import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { APP_CONFIG, type AppConfig } from '@config/index';
import type { AccessTokenClaims } from '../application/ports/token-signer.port';

/**
 * ADR-0017: HS256, claims exactly sub+sid (+iat/exp added by signing).
 * Implements identity's TokenSigner and satisfies access's TokenVerifier
 * shape; the composition root binds it to both tokens.
 */
@Injectable()
export class JwtTokenService {
  readonly accessTtlSeconds: number;
  private readonly jwt: JwtService;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.accessTtlSeconds = config.accessTokenTtlSeconds;
    this.jwt = new JwtService({
      secret: config.jwtSecret,
      signOptions: { algorithm: 'HS256', expiresIn: config.accessTokenTtlSeconds },
      verifyOptions: { algorithms: ['HS256'] },
    });
  }

  async sign(claims: AccessTokenClaims): Promise<string> {
    return this.jwt.signAsync({ sub: claims.sub, sid: claims.sid });
  }

  /** Returns the claims, or null for any invalid/expired/foreign token. */
  async verify(token: string): Promise<AccessTokenClaims | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown; sid?: unknown }>(token);
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
        return null;
      }
      return { sub: payload.sub, sid: payload.sid };
    } catch {
      return null;
    }
  }
}
