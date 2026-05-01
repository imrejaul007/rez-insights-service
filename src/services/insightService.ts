import { z } from 'zod';
import {
  IInsightDocument,
  CreateInsightDTO,
  UpdateInsightDTO,
  InsightQueryOptions,
  InsightType,
  InsightPriority,
  InsightStatus,
} from '../models/Insight';
import {
  createInsight,
  findInsightById,
  findUserInsights,
  findMerchantInsights,
  updateInsight,
  deleteInsight,
  dismissInsight,
  countUserInsights,
} from '../models/Insight';
import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from '../config/redis';

export const CreateInsightSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  merchantId: z.string().optional(),
  type: z.enum(['churn_risk', 'upsell', 'cross_sell', 'reorder', 'campaign', 'general'] as const),
  priority: z.enum(['high', 'medium', 'low'] as const).default('medium'),
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description cannot exceed 2000 characters'),
  recommendation: z.string().min(1, 'Recommendation is required').max(2000, 'Recommendation cannot exceed 2000 characters'),
  actionData: z.record(z.unknown()).optional(),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
  expiresAt: z.union([z.string().datetime(), z.date()]).transform(val => val instanceof Date ? val : new Date(val)),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateInsightSchema = z.object({
  status: z.enum(['new', 'viewed', 'actioned', 'dismissed'] as const).optional(),
  priority: z.enum(['high', 'medium', 'low'] as const).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  recommendation: z.string().min(1).max(2000).optional(),
  actionData: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const InsightQuerySchema = z.object({
  status: z.enum(['new', 'viewed', 'actioned', 'dismissed'] as const).optional(),
  type: z.enum(['churn_risk', 'upsell', 'cross_sell', 'reorder', 'campaign', 'general'] as const).optional(),
  priority: z.enum(['high', 'medium', 'low'] as const).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  skip: z.coerce.number().min(0).default(0),
  includeExpired: z.boolean().default(false),
});

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

function successResult<T>(data: T): ServiceResult<T> {
  return { success: true, data, statusCode: 200 };
}

function errorResult<T>(error: string, statusCode: number): ServiceResult<T> {
  return { success: false, error, statusCode };
}

function getCacheKey(prefix: string, id: string): string {
  return `insights:${prefix}:${id}`;
}

export async function create(data: CreateInsightDTO): Promise<ServiceResult<IInsightDocument>> {
  try {
    const validatedData = CreateInsightSchema.parse(data);
    const insight = await createInsight(validatedData);
    await cacheDeletePattern(`insights:user:${insight.userId}:*`);
    if (insight.merchantId) {
      await cacheDeletePattern(`insights:merchant:${insight.merchantId}:*`);
    }
    return successResult(insight);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
    }
    if (error instanceof Error) {
      return errorResult(`Failed to create insight: ${error.message}`, 500);
    }
    return errorResult('An unknown error occurred while creating the insight', 500);
  }
}

export async function update(id: string, data: UpdateInsightDTO): Promise<ServiceResult<IInsightDocument>> {
  try {
    if (!id || id.length !== 24) {
      return errorResult('Invalid insight ID format', 400);
    }
    const validatedData = UpdateInsightSchema.parse(data);
    const insight = await updateInsight(id, validatedData);
    if (!insight) {
      return errorResult('Insight not found', 404);
    }
    await cacheDelete(`insights:id:${id}`);
    await cacheDeletePattern(`insights:user:${insight.userId}:*`);
    return successResult(insight);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
    }
    if (error instanceof Error) {
      return errorResult(`Failed to update insight: ${error.message}`, 500);
    }
    return errorResult('An unknown error occurred while updating the insight', 500);
  }
}

export async function remove(id: string): Promise<ServiceResult<{ deleted: boolean }>> {
  try {
    if (!id || id.length !== 24) {
      return errorResult('Invalid insight ID format', 400);
    }
    const deleted = await deleteInsight(id);
    if (!deleted) {
      return errorResult('Insight not found', 404);
    }
    await cacheDelete(`insights:id:${id}`);
    await cacheDeletePattern('insights:user:*');
    return successResult({ deleted: true });
  } catch (error) {
    if (error instanceof Error) {
      return errorResult(`Failed to delete insight: ${error.message}`, 500);
    }
    return errorResult('An unknown error occurred while deleting the insight', 500);
  }
}

export async function dismiss(id: string, userId: string): Promise<ServiceResult<IInsightDocument>> {
  try {
    if (!id || id.length !== 24) {
      return errorResult('Invalid insight ID format', 400);
    }
    const insight = await dismissInsight(id);
    if (!insight) {
      return errorResult('Insight not found', 404);
    }
    await cacheDelete(`insights:id:${id}`);
    await cacheDeletePattern(`insights:user:${userId}:*`);
    return successResult(insight);
  } catch (error) {
    if (error instanceof Error) {
      return errorResult(`Failed to dismiss insight: ${error.message}`, 500);
    }
    return errorResult('An unknown error occurred while dismissing the insight', 500);
  }
}

export async function getInsightById(id: string): Promise<ServiceResult<IInsightDocument | null>> {
  try {
    if (!id || id.length !== 24) {
      return errorResult('Invalid insight ID format', 400);
    }
    const cacheKey = getCacheKey('id', id);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return successResult(parsed as IInsightDocument);
    }
    const insight = await findInsightById(id);
    if (!insight) {
      return errorResult('Insight not found', 404);
    }
    await cacheSet(cacheKey, JSON.stringify(insight.toJSON()));
    return successResult(insight);
  } catch (error) {
    if (error instanceof Error) {
      return errorResult(`Failed to fetch insight: ${error.message}`, 500);
    }
    return errorResult('An unknown error occurred while fetching the insight', 500);
  }
}

export async function getUserInsights(
  userId: string,
  query: unknown = {}
): Promise<ServiceResult<unknown[]>> {
  try {
    if (!userId) {
      return errorResult('User ID is required', 400);
    }
    const validatedQuery = InsightQuerySchema.parse(query);
    const options: InsightQueryOptions = {
      status: validatedQuery.status as InsightStatus | undefined,
      type: validatedQuery.type as InsightType | undefined,
      priority: validatedQuery.priority as InsightPriority | undefined,
      limit: validatedQuery.limit,
      skip: validatedQuery.skip,
      includeExpired: validatedQuery.includeExpired,
    };
    const cacheKey = getCacheKey('user', `${userId}:${JSON.stringify(options)}`);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return successResult(parsed);
    }
    const insights = await findUserInsights(userId, options);
    await cacheSet(cacheKey, JSON.stringify(insights));
    return successResult(insights);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
    }
    if (error instanceof Error) {
      return errorResult(`Failed to fetch user insights: ${error.message}`, 500);
    }
    return errorResult('An unknown error occurred while fetching user insights', 500);
  }
}

export async function getMerchantInsights(
  merchantId: string,
  query: unknown = {}
): Promise<ServiceResult<unknown[]>> {
  try {
    if (!merchantId) {
      return errorResult('Merchant ID is required', 400);
    }
    const validatedQuery = InsightQuerySchema.parse(query);
    const options: InsightQueryOptions = {
      status: validatedQuery.status as InsightStatus | undefined,
      type: validatedQuery.type as InsightType | undefined,
      priority: validatedQuery.priority as InsightPriority | undefined,
      limit: validatedQuery.limit,
      skip: validatedQuery.skip,
      includeExpired: validatedQuery.includeExpired,
    };
    const cacheKey = getCacheKey('merchant', `${merchantId}:${JSON.stringify(options)}`);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return successResult(parsed);
    }
    const insights = await findMerchantInsights(merchantId, options);
    await cacheSet(cacheKey, JSON.stringify(insights));
    return successResult(insights);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
    }
    if (error instanceof Error) {
      return errorResult(`Failed to fetch merchant insights: ${error.message}`, 500);
    }
    return errorResult('An unknown error occurred while fetching merchant insights', 500);
  }
}

export async function getUserInsightCount(userId: string): Promise<ServiceResult<{ count: number }>> {
  try {
    if (!userId) {
      return errorResult('User ID is required', 400);
    }
    const count = await countUserInsights(userId);
    return successResult({ count });
  } catch (error) {
    if (error instanceof Error) {
      return errorResult(`Failed to count user insights: ${error.message}`, 500);
    }
    return errorResult('An unknown error occurred while counting user insights', 500);
  }
}
