import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { REPORT_REASONS, REPORT_TARGET_TYPES } from '../../domain';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

export const createReportSchema = z
  .object({
    targetType: z.enum(REPORT_TARGET_TYPES),
    targetId: ulid,
    reason: z.enum(REPORT_REASONS),
    note: z.string().trim().max(500).nullable().default(null),
  })
  .strict();
export class CreateReportDto extends createZodDto(createReportSchema) {}

export const reportResultSchema = z.object({
  received: z.literal(true),
  hidden: z.boolean().describe('True when this report pushed the content over the hide threshold.'),
});
export class ReportResultDto extends createZodDto(reportResultSchema) {}

export const reportListQuerySchema = z
  .object({ limit: z.coerce.number().int().min(1).max(200).default(50) })
  .strict();
export class ReportListQueryDto extends createZodDto(reportListQuerySchema) {}

export const reportGroupSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: ulid,
  reportCount: z.number().int(),
  reasons: z.partialRecord(z.enum(REPORT_REASONS), z.number().int()),
  notes: z.array(z.string()),
  autoHidden: z.boolean(),
  firstReportedAt: z.string(),
  lastReportedAt: z.string(),
});
export const reportGroupListSchema = z.object({ data: z.array(reportGroupSchema) });
export class ReportGroupListDto extends createZodDto(reportGroupListSchema) {}

export const resolveReportsSchema = z
  .object({
    targetType: z.enum(REPORT_TARGET_TYPES),
    targetId: ulid,
    decision: z.enum(['dismiss', 'remove']),
  })
  .strict();
export class ResolveReportsDto extends createZodDto(resolveReportsSchema) {}

export const resolveResultSchema = z.object({ resolved: z.number().int() });
export class ResolveResultDto extends createZodDto(resolveResultSchema) {}
