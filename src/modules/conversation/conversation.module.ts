import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { ActivityModule } from '@modules/activity';
import { CatalogModule } from '@modules/catalog';
import { MediaModule } from '@modules/media';
import { ProfileModule } from '@modules/profile';
import { SettingsModule } from '@modules/settings';
import {
  CONVERSATION_REPOSITORY,
  ConversationAuthorization,
  CreateConversationUseCase,
  GetConversationUseCase,
  ListConversationsUseCase,
  ListHobbyFeedUseCase,
  ReplyToConversationUseCase,
  SetConversationStatusUseCase,
  CreatePostUseCase,
  DeleteOwnContentUseCase,
  GetPostUseCase,
  ListPostFeedUseCase,
  POST_REPOSITORY,
  PostViewAssembler,
  ReplyToPostUseCase,
  SetLikeUseCase,
} from './application';
import { PrismaConversationRepository, PrismaPostRepository } from './infrastructure';
import { ConversationController, PostController } from './interface';

@Module({
  imports: [
    PrismaModule,
    AccessModule,
    CatalogModule,
    ProfileModule,
    ActivityModule,
    MediaModule,
    SettingsModule,
  ],
  controllers: [ConversationController, PostController],
  providers: [
    ConversationAuthorization,
    ListConversationsUseCase,
    GetConversationUseCase,
    CreateConversationUseCase,
    ReplyToConversationUseCase,
    SetConversationStatusUseCase,
    ListHobbyFeedUseCase,
    PostViewAssembler,
    ListPostFeedUseCase,
    GetPostUseCase,
    CreatePostUseCase,
    ReplyToPostUseCase,
    SetLikeUseCase,
    DeleteOwnContentUseCase,
    { provide: CONVERSATION_REPOSITORY, useClass: PrismaConversationRepository },
    { provide: POST_REPOSITORY, useClass: PrismaPostRepository },
  ],
  exports: [SetConversationStatusUseCase],
})
export class ConversationModule {}
