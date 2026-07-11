import { Module } from '@nestjs/common';
import { ConfigModule } from '@config/index';

@Module({
  imports: [ConfigModule],
})
export class AppModule {}
