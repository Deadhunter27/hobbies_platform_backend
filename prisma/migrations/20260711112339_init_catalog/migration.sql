-- CreateEnum
CREATE TYPE "hobby_difficulty" AS ENUM ('beginner_friendly', 'moderate', 'demanding');

-- CreateEnum
CREATE TYPE "hobby_cost_level" AS ENUM ('free', 'low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "hobby_setting" AS ENUM ('indoor', 'outdoor', 'both');

-- CreateEnum
CREATE TYPE "hobby_status" AS ENUM ('draft', 'active', 'archived');

-- CreateTable
CREATE TABLE "catalog_hobby_category" (
    "id" CHAR(26) NOT NULL,
    "parentId" CHAR(26),
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "catalog_hobby_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_hobby" (
    "id" CHAR(26) NOT NULL,
    "categoryId" CHAR(26) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "difficulty" "hobby_difficulty" NOT NULL,
    "costLevel" "hobby_cost_level" NOT NULL,
    "setting" "hobby_setting" NOT NULL,
    "status" "hobby_status" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "catalog_hobby_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_hobby_category_slug_key" ON "catalog_hobby_category"("slug");

-- CreateIndex
CREATE INDEX "catalog_hobby_category_parentId_idx" ON "catalog_hobby_category"("parentId");

-- CreateIndex
CREATE INDEX "catalog_hobby_category_sortOrder_id_idx" ON "catalog_hobby_category"("sortOrder", "id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_hobby_slug_key" ON "catalog_hobby"("slug");

-- CreateIndex
CREATE INDEX "catalog_hobby_status_name_id_idx" ON "catalog_hobby"("status", "name", "id");

-- CreateIndex
CREATE INDEX "catalog_hobby_categoryId_status_idx" ON "catalog_hobby"("categoryId", "status");

-- CreateIndex
CREATE INDEX "catalog_hobby_difficulty_idx" ON "catalog_hobby"("difficulty");

-- CreateIndex
CREATE INDEX "catalog_hobby_costLevel_idx" ON "catalog_hobby"("costLevel");

-- CreateIndex
CREATE INDEX "catalog_hobby_setting_idx" ON "catalog_hobby"("setting");

-- AddForeignKey
ALTER TABLE "catalog_hobby_category" ADD CONSTRAINT "catalog_hobby_category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "catalog_hobby_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_hobby" ADD CONSTRAINT "catalog_hobby_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "catalog_hobby_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
