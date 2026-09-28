import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import { GetHobbyUseCase } from '@modules/catalog/application/use-cases/get-hobby.use-case';
import { GetMyHobbyContextUseCase } from '@modules/profile/application/profile.use-cases';
import { InvalidCursorError } from '@shared/errors';
import { decodeCursor, newId } from '@shared/utils';
import {
  ConversationNotFoundError,
  type Conversation,
  type ConversationDetail,
  type ConversationPage,
  type ConversationReply,
} from '../domain';
import { ConversationAuthorization } from './authorization';
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from './ports/conversation.repository.port';

function pageCursor(raw?: string): { createdAt: Date; id: string } | null {
  if (!raw) return null;
  const decoded = decodeCursor(raw);
  const createdAt = new Date(decoded.name);
  if (Number.isNaN(createdAt.getTime())) throw new InvalidCursorError();
  return { createdAt, id: decoded.id };
}

@Injectable()
export class ListConversationsUseCase {
  constructor(
    private readonly getHobby: GetHobbyUseCase,
    @Inject(CONVERSATION_REPOSITORY) private readonly repository: ConversationRepository,
  ) {}

  async execute(input: {
    hobbyId: string;
    limit: number;
    cursor?: string;
  }): Promise<ConversationPage> {
    await this.getHobby.execute({ slugOrId: input.hobbyId });
    return this.repository.listPublished({
      hobbyId: input.hobbyId,
      limit: input.limit,
      cursor: pageCursor(input.cursor),
    });
  }
}

@Injectable()
export class GetConversationUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY) private readonly repository: ConversationRepository,
  ) {}

  async execute(id: string): Promise<ConversationDetail> {
    const detail = await this.repository.findPublishedById(id);
    if (!detail) throw new ConversationNotFoundError(id);
    return detail;
  }
}

export interface CreateConversationInput {
  title: string;
  body: string;
  communityReferenceId: string | null;
  activityReferenceId: string | null;
}

@Injectable()
export class CreateConversationUseCase {
  constructor(
    private readonly authorization: ConversationAuthorization,
    private readonly getHobby: GetHobbyUseCase,
    private readonly getHobbyContext: GetMyHobbyContextUseCase,
    @Inject(CONVERSATION_REPOSITORY) private readonly repository: ConversationRepository,
  ) {}

  async execute(
    actor: Actor,
    hobbyId: string,
    input: CreateConversationInput,
    now = new Date(),
  ): Promise<Conversation> {
    await this.authorization.assertCanWrite(actor);
    await this.getHobby.execute({ slugOrId: hobbyId });
    await this.getHobbyContext.execute(actor, hobbyId);

    return this.repository.createConversation({
      id: newId(),
      hobbyId,
      communityReferenceId: input.communityReferenceId,
      activityReferenceId: input.activityReferenceId,
      authorId: actor.id,
      authorDisplayName: actor.displayName,
      title: input.title.trim(),
      body: input.body.trim(),
      status: 'published',
      createdAt: now,
      updatedAt: now,
    });
  }
}

@Injectable()
export class ReplyToConversationUseCase {
  constructor(
    private readonly authorization: ConversationAuthorization,
    @Inject(CONVERSATION_REPOSITORY) private readonly repository: ConversationRepository,
  ) {}

  async execute(
    actor: Actor,
    conversationId: string,
    body: string,
    now = new Date(),
  ): Promise<ConversationReply> {
    await this.authorization.assertCanWrite(actor);
    const conversation = await this.repository.findPublishedById(conversationId);
    if (!conversation) throw new ConversationNotFoundError(conversationId);

    return this.repository.createReply({
      id: newId(),
      conversationId,
      authorId: actor.id,
      authorDisplayName: actor.displayName,
      body: body.trim(),
      createdAt: now,
      updatedAt: now,
    });
  }
}
