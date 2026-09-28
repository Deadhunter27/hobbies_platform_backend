import { Module } from '@nestjs/common';
import { AccessModule } from '@modules/access';
import { ConversationModule } from '@modules/conversation';
import { AdminAuthorization, ModerateConversationUseCase } from './application';
import { AdminConversationController } from './interface';

@Module({
  imports: [AccessModule, ConversationModule],
  controllers: [AdminConversationController],
  providers: [AdminAuthorization, ModerateConversationUseCase],
})
export class AdminModule {}
