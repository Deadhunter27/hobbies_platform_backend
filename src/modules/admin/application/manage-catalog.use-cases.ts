import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access/domain';
import {
  CreateHobbyCategoryUseCase,
  UpdateHobbyCategoryUseCase,
  type CreateHobbyCategoryInput,
  type UpdateHobbyCategoryInput,
} from '@modules/catalog/application/use-cases/manage-hobby-category.use-cases';
import {
  CreateHobbyUseCase,
  UpdateHobbyUseCase,
  type CreateHobbyInput,
  type UpdateHobbyInput,
} from '@modules/catalog/application/use-cases/manage-hobby.use-cases';
import type { Hobby, HobbyCategory } from '@modules/catalog/domain';
import { AUDIT_WRITER, UNIT_OF_WORK, type AuditWriter, type UnitOfWork } from '@shared/application';
import { AdminAuthorization } from './admin-authorization';

@Injectable()
export class ManageCatalogUseCase {
  constructor(
    private readonly authorization: AdminAuthorization,
    private readonly createCategory: CreateHobbyCategoryUseCase,
    private readonly updateCategory: UpdateHobbyCategoryUseCase,
    private readonly createHobby: CreateHobbyUseCase,
    private readonly updateHobby: UpdateHobbyUseCase,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async createHobbyCategory(
    actor: Actor,
    input: CreateHobbyCategoryInput,
    now = new Date(),
  ): Promise<HobbyCategory> {
    await this.authorization.assertCanManageCatalog(actor);
    return this.uow.run(async (tx) => {
      const category = await this.createCategory.execute(input, now, tx);
      await this.audit.write(
        {
          actorId: actor.id,
          action: 'catalog.category.create',
          resourceType: 'hobby_category',
          resourceId: category.id,
          metadata: { slug: category.slug },
        },
        tx,
      );
      return category;
    });
  }

  async updateHobbyCategory(
    actor: Actor,
    categoryId: string,
    input: UpdateHobbyCategoryInput,
    now = new Date(),
  ): Promise<HobbyCategory> {
    await this.authorization.assertCanManageCatalog(actor);
    return this.uow.run(async (tx) => {
      const category = await this.updateCategory.execute(categoryId, input, now, tx);
      await this.audit.write(
        {
          actorId: actor.id,
          action: 'catalog.category.update',
          resourceType: 'hobby_category',
          resourceId: categoryId,
          metadata: { slug: category.slug },
        },
        tx,
      );
      return category;
    });
  }

  async createCatalogHobby(
    actor: Actor,
    input: CreateHobbyInput,
    now = new Date(),
  ): Promise<Hobby> {
    await this.authorization.assertCanManageCatalog(actor);
    return this.uow.run(async (tx) => {
      const hobby = await this.createHobby.execute(input, now, tx);
      await this.audit.write(
        {
          actorId: actor.id,
          action: 'catalog.hobby.create',
          resourceType: 'hobby',
          resourceId: hobby.id,
          metadata: { slug: hobby.slug, status: hobby.status },
        },
        tx,
      );
      return hobby;
    });
  }

  async updateCatalogHobby(
    actor: Actor,
    hobbyId: string,
    input: UpdateHobbyInput,
    now = new Date(),
  ): Promise<Hobby> {
    await this.authorization.assertCanManageCatalog(actor);
    return this.uow.run(async (tx) => {
      const hobby = await this.updateHobby.execute(hobbyId, input, now, tx);
      await this.audit.write(
        {
          actorId: actor.id,
          action: 'catalog.hobby.update',
          resourceType: 'hobby',
          resourceId: hobbyId,
          metadata: { slug: hobby.slug, status: hobby.status },
        },
        tx,
      );
      return hobby;
    });
  }
}
