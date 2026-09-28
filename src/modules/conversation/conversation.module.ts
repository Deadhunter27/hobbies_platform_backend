import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { ActivityModule } from '@modules/activity';
import { CatalogModule } from '@modules/catalog';
import { ProfileModule } from '@modules/profile';
import {
  CONVERSATION_REPOSITORY,
  ConversationAuthorization,
  CreateConversationUseCase,
  GetConversationUseCase,
  ListConversationsUseCase,
  ListHobbyFeedUseCase,
  ReplyToConversationUseCase,
  SetConversationStatusUseCase,
} from './application';
import { PrismaConversationRepository } from './infrastructure';
import { ConversationController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule, CatalogModule, ProfileModule, ActivityModule],
  controllers: [ConversationController],
  providers: [
    ConversationAuthorization,
    ListConversationsUseCase,
    GetConversationUseCase,
    CreateConversationUseCase,
    ReplyToConversationUseCase,
    SetConversationStatusUseCase,
    ListHobbyFeedUseCase,
    { provide: CONVERSATION_REPOSITORY, useClass: PrismaConversationRepository },
  ],
  exports: [SetConversationStatusUseCase],
})
export class ConversationModule {}
