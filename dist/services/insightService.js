"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightQuerySchema = exports.UpdateInsightSchema = exports.CreateInsightSchema = void 0;
exports.createNewInsight = createNewInsight;
exports.getInsightById = getInsightById;
exports.getUserInsights = getUserInsights;
exports.getMerchantInsights = getMerchantInsights;
exports.updateInsightStatus = updateInsightStatus;
exports.dismissInsightById = dismissInsightById;
exports.removeInsight = removeInsight;
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
    expiresAt: zod_1.z.string().datetime().or(zod_1.z.date()),
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
    limit: zod_1.z.coerce.number().min(1).max(100).optional(),
    skip: zod_1.z.coerce.number().min(0).optional(),
    includeExpired: zod_1.z.coerce.boolean().optional(),
});
function successResult(data, statusCode = 200) {
    return { success: true, data, statusCode };
}
function errorResult(error, statusCode = 400) {
    return { success: false, error, statusCode };
}
function getCacheKey(prefix, id) {
    return `insights:${prefix}:${id}`;
}
function getUserCachePattern(userId) {
    return `insights:user:${userId}:*`;
}
function getMerchantCachePattern(merchantId) {
    return `insights:merchant:${merchantId}:*`;
}
async function createNewInsight(data) {
    try {
        const validatedData = exports.CreateInsightSchema.parse(data);
        const expiresAt = typeof validatedData.expiresAt === 'string'
            ? new Date(validatedData.expiresAt)
            : validatedData.expiresAt;
        const insightDTO = {
            userId: validatedData.userId,
            merchantId: validatedData.merchantId,
            type: validatedData.type,
            priority: validatedData.priority,
            title: validatedData.title,
            description: validatedData.description,
            recommendation: validatedData.recommendation,
            actionData: validatedData.actionData,
            confidence: validatedData.confidence,
            expiresAt,
            metadata: validatedData.metadata,
        };
        const insight = await (0, Insight_1.createInsight)(insightDTO);
        await (0, redis_1.cacheDeletePattern)(getUserCachePattern(insight.userId));
        if (insight.merchantId) {
            await (0, redis_1.cacheDeletePattern)(getMerchantCachePattern(insight.merchantId));
        }
        return successResult(insight, 201);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            return errorResult(`Validation failed: ${errorMessages}`, 400);
        }
        if (error instanceof Error) {
            return errorResult(`Failed to create insight: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while creating the insight', 500);
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
            return successResult(cached);
        }
        const insight = await (0, Insight_1.findInsightById)(id);
        if (!insight) {
            return errorResult('Insight not found', 404);
        }
        await (0, redis_1.cacheSet)(cacheKey, insight.toJSON());
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
            return successResult(cached);
        }
        const insights = await (0, Insight_1.findUserInsights)(userId, options);
        await (0, redis_1.cacheSet)(cacheKey, insights);
        return successResult(insights);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            return errorResult(`Validation failed: ${errorMessages}`, 400);
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
            return successResult(cached);
        }
        const insights = await (0, Insight_1.findMerchantInsights)(merchantId, options);
        await (0, redis_1.cacheSet)(cacheKey, insights);
        return successResult(insights);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            return errorResult(`Validation failed: ${errorMessages}`, 400);
        }
        if (error instanceof Error) {
            return errorResult(`Failed to fetch merchant insights: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while fetching merchant insights', 500);
    }
}
async function updateInsightStatus(id, data) {
    try {
        if (!id || id.length !== 24) {
            return errorResult('Invalid insight ID format', 400);
        }
        const validatedData = exports.UpdateInsightSchema.parse(data);
        const updateDTO = {
            status: validatedData.status,
            priority: validatedData.priority,
            title: validatedData.title,
            description: validatedData.description,
            recommendation: validatedData.recommendation,
            actionData: validatedData.actionData,
            metadata: validatedData.metadata,
        };
        const insight = await (0, Insight_1.updateInsight)(id, updateDTO);
        if (!insight) {
            return errorResult('Insight not found', 404);
        }
        await (0, redis_1.cacheDelete)(getCacheKey('id', id));
        await (0, redis_1.cacheDeletePattern)(getUserCachePattern(insight.userId));
        if (insight.merchantId) {
            await (0, redis_1.cacheDeletePattern)(getMerchantCachePattern(insight.merchantId));
        }
        return successResult(insight);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            return errorResult(`Validation failed: ${errorMessages}`, 400);
        }
        if (error instanceof Error) {
            return errorResult(`Failed to update insight: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while updating the insight', 500);
    }
}
async function dismissInsightById(id) {
    try {
        if (!id || id.length !== 24) {
            return errorResult('Invalid insight ID format', 400);
        }
        const insight = await (0, Insight_1.dismissInsight)(id);
        if (!insight) {
            return errorResult('Insight not found', 404);
        }
        await (0, redis_1.cacheDelete)(getCacheKey('id', id));
        await (0, redis_1.cacheDeletePattern)(getUserCachePattern(insight.userId));
        if (insight.merchantId) {
            await (0, redis_1.cacheDeletePattern)(getMerchantCachePattern(insight.merchantId));
        }
        return successResult(insight);
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResult(`Failed to dismiss insight: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while dismissing the insight', 500);
    }
}
async function removeInsight(id) {
    try {
        if (!id || id.length !== 24) {
            return errorResult('Invalid insight ID format', 400);
        }
        const existingInsight = await (0, Insight_1.findInsightById)(id);
        if (!existingInsight) {
            return errorResult('Insight not found', 404);
        }
        const deleted = await (0, Insight_1.deleteInsight)(id);
        if (!deleted) {
            return errorResult('Failed to delete insight', 500);
        }
        await (0, redis_1.cacheDelete)(getCacheKey('id', id));
        await (0, redis_1.cacheDeletePattern)(getUserCachePattern(existingInsight.userId));
        if (existingInsight.merchantId) {
            await (0, redis_1.cacheDeletePattern)(getMerchantCachePattern(existingInsight.merchantId));
        }
        return successResult({ deleted: true }, 200);
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResult(`Failed to delete insight: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while deleting the insight', 500);
    }
}
async function getUserInsightCount(userId, status) {
    try {
        if (!userId) {
            return errorResult('User ID is required', 400);
        }
        const count = await (0, Insight_1.countUserInsights)(userId, status);
        return successResult(count);
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResult(`Failed to count user insights: ${error.message}`, 500);
        }
        return errorResult('An unknown error occurred while counting user insights', 500);
    }
}
//# sourceMappingURL=insightService.js.map