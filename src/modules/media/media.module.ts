import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { MEDIA_REPOSITORY, MediaService, OBJECT_STORAGE } from './application';
import { PrismaMediaRepository, S3ObjectStorage } from './infrastructure';
import { MediaController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    { provide: MEDIA_REPOSITORY, useClass: PrismaMediaRepository },
    { provide: OBJECT_STORAGE, useClass: S3ObjectStorage },
  ],
  exports: [MediaService],
})
export class MediaModule {}
