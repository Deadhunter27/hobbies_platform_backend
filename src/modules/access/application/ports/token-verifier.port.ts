/**
 * Declared by access, implemented by identity's JWT adapter, bound at the
 * composition root (ADR-0018 dependency inversion — access imports no
 * other module).
 */
export interface VerifiedTokenClaims {
  /** userId */
  sub: string;
  /** sessionId */
  sid: string;
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedTokenClaims | null>;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
