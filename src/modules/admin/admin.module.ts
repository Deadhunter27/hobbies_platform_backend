import { Module } from '@nestjs/common';
import { AccessModule } from '@modules/access';
import { ActivityModule } from '@modules/activity';
import { CommunityModule } from '@modules/community';
import { ConversationModule } from '@modules/conversation';
import {
  AdminAuthorization,
  CurateActivityUseCase,
  CurateCommunityUseCase,
  ModerateConversationUseCase,
} from './application';
import { AdminConversationController, AdminSupplyController } from './interface';

@Module({
  imports: [AccessModule, ActivityModule, CommunityModule, ConversationModule],
  controllers: [AdminConversationController, AdminSupplyController],
  providers: [
    AdminAuthorization,
    ModerateConversationUseCase,
    CurateActivityUseCase,
    CurateCommunityUseCase,
  ],
})
export class AdminModule {}
