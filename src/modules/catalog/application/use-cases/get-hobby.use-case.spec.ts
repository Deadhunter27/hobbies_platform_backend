import { GetHobbyUseCase } from './get-hobby.use-case';
import { InMemoryHobbyRepository } from './test-support/in-memory-hobby.repository';
import { makeHobbyProps } from './test-support/hobby-props.factory';
import { HobbyNotFoundError } from '../../domain';

describe('GetHobbyUseCase', () => {
  it('returns the hobby when found by slug', async () => {
    const repository = new InMemoryHobbyRepository();
    repository.seed([makeHobbyProps({ slug: 'padel' })]);
    const useCase = new GetHobbyUseCase(repository);

    const hobby = await useCase.execute({ slugOrId: 'padel' });

    expect(hobby.slug).toBe('padel');
  });

  it('returns the hobby when found by id', async () => {
    const repository = new InMemoryHobbyRepository();
    const props = makeHobbyProps();
    repository.seed([props]);
    const useCase = new GetHobbyUseCase(repository);

    const hobby = await useCase.execute({ slugOrId: props.id });

    expect(hobby.id).toBe(props.id);
  });

  it('throws HobbyNotFoundError with code HOBBY_NOT_FOUND when the hobby does not exist', async () => {
    const repository = new InMemoryHobbyRepository();
    const useCase = new GetHobbyUseCase(repository);

    await expect(useCase.execute({ slugOrId: 'missing' })).rejects.toThrow(HobbyNotFoundError);
    await expect(useCase.execute({ slugOrId: 'missing' })).rejects.toMatchObject({
      code: 'HOBBY_NOT_FOUND',
    });
  });

  it('does not return draft or archived hobbies', async () => {
    const repository = new InMemoryHobbyRepository();
    repository.seed([makeHobbyProps({ slug: 'unpublished', status: 'draft' })]);
    const useCase = new GetHobbyUseCase(repository);

    await expect(useCase.execute({ slugOrId: 'unpublished' })).rejects.toThrow(HobbyNotFoundError);
  });
});
