"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightQuerySchema = exports.UpdateInsightSchema = exports.CreateInsightSchema = void 0;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.dismiss = dismiss;
exports.getInsightById = getInsightById;
exports.getUserInsights = getUserInsights;
exports.getMerchantInsights = getMerchantInsights;
exports.getUserInsightCount = getUserInsightCount;
const zod_1 = require("zod");
const Insight_1 = require("../models/Insight");
const redis_1 = require("../config/redis");
exports.CreateInsightSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID is required'),
    merchantId: zod_1.z.string().optional(),
    type: zod_1.z.enum(['churn_risk', 'upsell', 'cross_sell', 'reorder', 'campaign', 'general']),
    priority: zod_1.z.enum(['high', 'medium', 'low']).default('medium'),
    title: zod_1.z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
    description: zod_1.z.string().min(1, 'Description is required').max(2000, 'Description cannot exceed 2000 characters'),
    recommendation: zod_1.z.string().min(1, 'Recommendation is required').max(2000, 'Recommendation cannot exceed 2000 characters'),
    actionData: zod_1.z.record(zod_1.z.unknown()).optional(),
    confidence: zod_1.z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
    expiresAt: zod_1.z.union([zod_1.z.string().datetime(), zod_1.z.date()]).transform(val => val instanceof Date ? val : new Date(val)),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.UpdateInsightSchema = zod_1.z.object({
    status: zod_1.z.enum(['new', 'viewed', 'actioned', 'dismissed']).optional(),
    priority: zod_1.z.enum(['high', 'medium', 'low']).optional(),
    title: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().min(1).max(2000).optional(),
    recommendation: zod_1.z.string().min(1).max(2000).optional(),
    actionData: zod_1.z.record(zod_1.z.unknown()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.InsightQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['new', 'viewed', 'actioned', 'dismissed']).optional(),
    type: zod_1.z.enum(['churn_risk', 'upsell', 'cross_sell', 'reorder', 'campaign', 'general']).optional(),
    priority: zod_1.z.enum(['high', 'medium', 'low']).optional(),
    limit: zod_1.z.coerce.number().min(1).max(100).default(50),
    skip: zod_1.z.coerce.number().min(0).default(0),
    includeExpired: zod_1.z.boolean().default(false),
});
function successResult(data) {
    return { success: true, data, statusCode: 200 };
}
function errorResult(error, statusCode) {
    return { success: false, error, statusCode };
}
function getCacheKey(prefix, id) {
    return `insights:${prefix}:${id}`;
}
async function create(data) {
    try {
        const validatedData = exports.CreateInsightSchema.parse(data);
        const insight = await (0, Insight_1.createInsight)(validatedData);
        await (0, redis_1.cacheDeletePattern)(`insights:user:${insight.userId}:*`);
        if (insight.merchantId) {
            await (0, redis_1.cacheDeletePattern)(`insights:merchant:${insight.merchantId}:*`);
        }
        return successResult(insight);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return errorResult(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
        }
        if (error instanceof Error) {
            return errorResult(`Failed to create insight: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while creating the insight', 500);
    }
}
async function update(id, data) {
    try {
        if (!id || id.length !== 24) {
            return errorResult('Invalid insight ID format', 400);
        }
        const validatedData = exports.UpdateInsightSchema.parse(data);
        const insight = await (0, Insight_1.updateInsight)(id, validatedData);
        if (!insight) {
            return errorResult('Insight not found', 404);
        }
        await (0, redis_1.cacheDelete)(`insights:id:${id}`);
        await (0, redis_1.cacheDeletePattern)(`insights:user:${insight.userId}:*`);
        return successResult(insight);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return errorResult(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
        }
        if (error instanceof Error) {
            return errorResult(`Failed to update insight: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while updating the insight', 500);
    }
}
async function remove(id) {
    try {
        if (!id || id.length !== 24) {
            return errorResult('Invalid insight ID format', 400);
        }
        const deleted = await (0, Insight_1.deleteInsight)(id);
        if (!deleted) {
            return errorResult('Insight not found', 404);
        }
        await (0, redis_1.cacheDelete)(`insights:id:${id}`);
        await (0, redis_1.cacheDeletePattern)('insights:user:*');
        return successResult({ deleted: true });
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResult(`Failed to delete insight: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while deleting the insight', 500);
    }
}
async function dismiss(id, userId) {
    try {
        if (!id || id.length !== 24) {
            return errorResult('Invalid insight ID format', 400);
        }
        const insight = await (0, Insight_1.dismissInsight)(id);
        if (!insight) {
            return errorResult('Insight not found', 404);
        }
        await (0, redis_1.cacheDelete)(`insights:id:${id}`);
        await (0, redis_1.cacheDeletePattern)(`insights:user:${userId}:*`);
        return successResult(insight);
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResult(`Failed to dismiss insight: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while dismissing the insight', 500);
    }
}
async function getInsightById(id) {
    try {
        if (!id || id.length !== 24) {
            return errorResult('Invalid insight ID format', 400);
        }
        const cacheKey = getCacheKey('id', id);
        const cached = await (0, redis_1.cacheGet)(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            return successResult(parsed);
        }
        const insight = await (0, Insight_1.findInsightById)(id);
        if (!insight) {
            return errorResult('Insight not found', 404);
        }
        await (0, redis_1.cacheSet)(cacheKey, JSON.stringify(insight.toJSON()));
        return successResult(insight);
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResult(`Failed to fetch insight: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while fetching the insight', 500);
    }
}
async function getUserInsights(userId, query = {}) {
    try {
        if (!userId) {
            return errorResult('User ID is required', 400);
        }
        const validatedQuery = exports.InsightQuerySchema.parse(query);
        const options = {
            status: validatedQuery.status,
            type: validatedQuery.type,
            priority: validatedQuery.priority,
            limit: validatedQuery.limit,
            skip: validatedQuery.skip,
            includeExpired: validatedQuery.includeExpired,
        };
        const cacheKey = getCacheKey('user', `${userId}:${JSON.stringify(options)}`);
        const cached = await (0, redis_1.cacheGet)(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            return successResult(parsed);
        }
        const insights = await (0, Insight_1.findUserInsights)(userId, options);
        await (0, redis_1.cacheSet)(cacheKey, JSON.stringify(insights));
        return successResult(insights);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return errorResult(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
        }
        if (error instanceof Error) {
            return errorResult(`Failed to fetch user insights: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while fetching user insights', 500);
    }
}
async function getMerchantInsights(merchantId, query = {}) {
    try {
        if (!merchantId) {
            return errorResult('Merchant ID is required', 400);
        }
        const validatedQuery = exports.InsightQuerySchema.parse(query);
        const options = {
            status: validatedQuery.status,
            type: validatedQuery.type,
            priority: validatedQuery.priority,
            limit: validatedQuery.limit,
            skip: validatedQuery.skip,
            includeExpired: validatedQuery.includeExpired,
        };
        const cacheKey = getCacheKey('merchant', `${merchantId}:${JSON.stringify(options)}`);
        const cached = await (0, redis_1.cacheGet)(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            return successResult(parsed);
        }
        const insights = await (0, Insight_1.findMerchantInsights)(merchantId, options);
        await (0, redis_1.cacheSet)(cacheKey, JSON.stringify(insights));
        return successResult(insights);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return errorResult(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
        }
        if (error instanceof Error) {
            return errorResult(`Failed to fetch merchant insights: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while fetching merchant insights', 500);
    }
}
async function getUserInsightCount(userId) {
    try {
        if (!userId) {
            return errorResult('User ID is required', 400);
        }
        const count = await (0, Insight_1.countUserInsights)(userId);
        return successResult({ count });
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResult(`Failed to count user insights: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while counting user insights', 500);
    }
}
//# sourceMappingURL=insightService.js.map