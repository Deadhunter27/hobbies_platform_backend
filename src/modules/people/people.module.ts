import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { CatalogModule } from '@modules/catalog';
import { IdentityModule } from '@modules/identity';
import { ProfileModule } from '@modules/profile';
import {
  FOLLOW_REPOSITORY,
  FollowGraph,
  FollowUseCase,
  GetPersonUseCase,
  ListFollowsUseCase,
  PERSON_DIRECTORY,
  PersonCards,
  SearchPeopleUseCase,
  SuggestPeopleUseCase,
} from './application';
import { IdentityPersonDirectory, PrismaFollowRepository } from './infrastructure';
import { PeopleController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule, CatalogModule, IdentityModule, ProfileModule],
  controllers: [PeopleController],
  providers: [
    PersonCards,
    GetPersonUseCase,
    SearchPeopleUseCase,
    SuggestPeopleUseCase,
    FollowUseCase,
    ListFollowsUseCase,
    FollowGraph,
    { provide: PERSON_DIRECTORY, useClass: IdentityPersonDirectory },
    { provide: FOLLOW_REPOSITORY, useClass: PrismaFollowRepository },
  ],
  exports: [FollowGraph],
})
export class PeopleModule {}
