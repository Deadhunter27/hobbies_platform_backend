import { Module } from '@nestjs/common';
import { AccessModule } from '@modules/access';
import { ActivityModule } from '@modules/activity';
import { CatalogModule } from '@modules/catalog';
import { CommunityModule } from '@modules/community';
import { ConversationModule } from '@modules/conversation';
import {
  AdminAuthorization,
  CurateActivityUseCase,
  CurateCommunityUseCase,
  ManageCatalogUseCase,
  ModerateConversationUseCase,
} from './application';
import {
  AdminCatalogController,
  AdminConversationController,
  AdminSupplyController,
} from './interface';

@Module({
  imports: [AccessModule, ActivityModule, CatalogModule, CommunityModule, ConversationModule],
  controllers: [AdminCatalogController, AdminConversationController, AdminSupplyController],
  providers: [
    AdminAuthorization,
    ModerateConversationUseCase,
    CurateActivityUseCase,
    CurateCommunityUseCase,
    ManageCatalogUseCase,
  ],
})
export class AdminModule {}
