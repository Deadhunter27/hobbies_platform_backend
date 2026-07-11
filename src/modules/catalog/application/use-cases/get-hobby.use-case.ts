import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '@shared/application';
import { Hobby, HobbyNotFoundError } from '../../domain';
import { HOBBY_REPOSITORY, type HobbyRepository } from '../ports/hobby.repository.port';

export interface GetHobbyInput {
  slugOrId: string;
}

@Injectable()
export class GetHobbyUseCase implements UseCase<GetHobbyInput, Hobby> {
  constructor(@Inject(HOBBY_REPOSITORY) private readonly repository: HobbyRepository) {}

  async execute(input: GetHobbyInput): Promise<Hobby> {
    const hobby = await this.repository.findBySlugOrId(input.slugOrId);
    if (!hobby) {
      throw new HobbyNotFoundError(input.slugOrId);
    }
    return hobby;
  }
}
