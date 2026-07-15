import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { ACTOR_DIRECTORY, TOKEN_VERIFIER } from '@modules/access';
import {
  ChangePasswordUseCase,
  LoginUseCase,
  LogoutUseCase,
  PASSWORD_HASHER,
  RefreshUseCase,
  RegisterUseCase,
  SESSION_REPOSITORY,
  TOKEN_SIGNER,
  USER_REPOSITORY,
} from './application';
import {
  Argon2PasswordHasher,
  JwtTokenService,
  PrismaSessionRepository,
  PrismaUserRepository,
} from './infrastructure';
import { IdentityActorDirectory } from './infrastructure/identity-actor.directory';
import { AuthController } from './interface/auth.controller';
import { MeController } from './interface/me.controller';

/**
 * identity -> access is the only cross-module import direction (ADR-0018):
 * identity implements and exports the TokenVerifier/ActorDirectory ports
 * that access declares; the composition root's APP_GUARD resolves them.
 */
@Module({
  imports: [PrismaModule],
  controllers: [AuthController, MeController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    RefreshUseCase,
    LogoutUseCase,
    ChangePasswordUseCase,
    JwtTokenService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SIGNER, useExisting: JwtTokenService },
    { provide: TOKEN_VERIFIER, useExisting: JwtTokenService },
    { provide: ACTOR_DIRECTORY, useClass: IdentityActorDirectory },
  ],
  exports: [TOKEN_VERIFIER, ACTOR_DIRECTORY],
})
export class IdentityModule {}
