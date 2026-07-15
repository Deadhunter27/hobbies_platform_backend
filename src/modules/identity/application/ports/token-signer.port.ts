export interface AccessTokenClaims {
  /** userId */
  sub: string;
  /** sessionId */
  sid: string;
}

/** Signs access JWTs. Claims are exactly sub+sid (+iat/exp added by the
 * adapter) — never roles (ADR-0017). Verification for guards lives in the
 * access module's TokenVerifier port; one adapter implements both. */
export interface TokenSigner {
  sign(claims: AccessTokenClaims): Promise<string>;
  readonly accessTtlSeconds: number;
}

export const TOKEN_SIGNER = Symbol('TOKEN_SIGNER');
