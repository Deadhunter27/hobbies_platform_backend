import { z } from 'zod';

export const hobbyDifficultySchema = z.enum(['beginner_friendly', 'moderate', 'demanding']);
export const hobbyCostLevelSchema = z.enum(['free', 'low', 'medium', 'high']);
export const hobbySettingSchema = z.enum(['indoor', 'outdoor', 'both']);
