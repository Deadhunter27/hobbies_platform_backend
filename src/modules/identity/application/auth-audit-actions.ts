/** ADR-0019: the auth lifecycle's audit action vocabulary. */
export const AUTH_AUDIT = {
  register: 'auth.register',
  loginSucceeded: 'auth.login.succeeded',
  loginFailed: 'auth.login.failed',
  refreshRotated: 'auth.refresh.rotated',
  reuseDetected: 'auth.refresh.reuse_detected',
  logout: 'auth.logout',
  passwordChanged: 'auth.password.changed',
} as const;
