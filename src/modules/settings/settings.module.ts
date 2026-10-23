import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { PLATFORM_SETTINGS_REPOSITORY, PlatformSettingsService } from './application';
import { PrismaPlatformSettingsRepository } from './infrastructure';

@Module({
  imports: [PrismaModule],
  providers: [
    PlatformSettingsService,
    { provide: PLATFORM_SETTINGS_REPOSITORY, useClass: PrismaPlatformSettingsRepository },
  ],
  exports: [PlatformSettingsService],
})
export class SettingsModule {}
