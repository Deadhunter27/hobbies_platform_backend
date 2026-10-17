import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infra/database';
import type { ProfileRepository } from '../application';
import { HandleTakenError, HobbyContext, ProfileContext, ProfileDetails } from '../domain';

@Injectable()
export class PrismaProfileRepository implements ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProfile(userId: string): Promise<ProfileContext | null> {
    const record = await this.prisma.profileUserContext.findUnique({ where: { userId } });
    return record ? ProfileContext.reconstitute(record) : null;
  }

  async upsertProfile(context: ProfileContext): Promise<ProfileContext> {
    const record = await this.prisma.profileUserContext.upsert({
      where: { userId: context.userId },
      create: {
        userId: context.userId,
        city: context.city,
        countryCode: context.countryCode,
        timezone: context.timezone,
      },
      update: {
        city: context.city,
        countryCode: context.countryCode,
        timezone: context.timezone,
      },
    });
    return ProfileContext.reconstitute(record);
  }

  async listHobbyContexts(userId: string): Promise<HobbyContext[]> {
    const records = await this.prisma.profileHobbyContext.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return records.map((record) => HobbyContext.reconstitute(record));
  }

  async findHobbyContext(userId: string, hobbyId: string): Promise<HobbyContext | null> {
    const record = await this.prisma.profileHobbyContext.findUnique({
      where: { userId_hobbyId: { userId, hobbyId } },
    });
    return record ? HobbyContext.reconstitute(record) : null;
  }

  async upsertHobbyContext(context: HobbyContext): Promise<HobbyContext> {
    const record = await this.prisma.profileHobbyContext.upsert({
      where: { userId_hobbyId: { userId: context.userId, hobbyId: context.hobbyId } },
      create: {
        id: context.id,
        userId: context.userId,
        hobbyId: context.hobbyId,
        experienceLevel: context.experienceLevel,
        primaryIntent: context.primaryIntent,
        secondaryIntents: context.secondaryIntents,
        goal: context.goal,
        socialPreference: context.socialPreference,
      },
      update: {
        experienceLevel: context.experienceLevel,
        primaryIntent: context.primaryIntent,
        secondaryIntents: context.secondaryIntents,
        goal: context.goal,
        socialPreference: context.socialPreference,
      },
    });
    return HobbyContext.reconstitute(record);
  }

  async findDetails(userId: string): Promise<ProfileDetails | null> {
    const record = await this.prisma.profileUserDetails.findUnique({ where: { userId } });
    return record ? ProfileDetails.reconstitute(record) : null;
  }

  async saveDetails(details: ProfileDetails): Promise<ProfileDetails> {
    const data = {
      handle: details.handle,
      birthYear: details.birthYear,
      gender: details.gender,
      instagramHandle: details.instagramHandle,
      tiktokHandle: details.tiktokHandle,
      acquisitionSource: details.acquisitionSource,
      acquisitionDetail: details.acquisitionDetail,
      avatarMediaId: details.avatarMediaId,
      marketingConsent: details.marketingConsent,
      marketingConsentUpdatedAt: details.marketingConsentUpdatedAt,
      introCompletedAt: details.introCompletedAt,
    };
    try {
      const record = await this.prisma.profileUserDetails.upsert({
        where: { userId: details.userId },
        create: { userId: details.userId, ...data },
        update: data,
      });
      return ProfileDetails.reconstitute(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        details.handle
      ) {
        throw new HandleTakenError(details.handle);
      }
      throw error;
    }
  }
}
