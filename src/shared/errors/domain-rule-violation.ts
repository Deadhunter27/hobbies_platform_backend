import { AppError } from './app-error';

export class DomainRuleViolation extends AppError {
  constructor(
    message: string,
    details?: unknown[],
    code = 'DOMAIN_RULE_VIOLATION',
    cause?: unknown,
  ) {
    super(code, message, details, cause);
  }
}
