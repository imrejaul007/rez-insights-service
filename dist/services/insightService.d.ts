import { z } from 'zod';
import { IInsightDocument, CreateInsightDTO, UpdateInsightDTO } from '../models/Insight';
export declare const CreateInsightSchema: z.ZodObject<{
    userId: z.ZodString;
    merchantId: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["churn_risk", "upsell", "cross_sell", "reorder", "campaign", "general"]>;
    priority: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
    title: z.ZodString;
    description: z.ZodString;
    recommendation: z.ZodString;
    actionData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    confidence: z.ZodNumber;
    expiresAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "churn_risk" | "upsell" | "cross_sell" | "reorder" | "campaign" | "general";
    userId: string;
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    recommendation: string;
    confidence: number;
    expiresAt: Date;
    merchantId?: string | undefined;
    actionData?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    type: "churn_risk" | "upsell" | "cross_sell" | "reorder" | "campaign" | "general";
    userId: string;
    title: string;
    description: string;
    recommendation: string;
    confidence: number;
    expiresAt: string | Date;
    merchantId?: string | undefined;
    priority?: "high" | "medium" | "low" | undefined;
    actionData?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const UpdateInsightSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["new", "viewed", "actioned", "dismissed"]>>;
    priority: z.ZodOptional<z.ZodEnum<["high", "medium", "low"]>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    recommendation: z.ZodOptional<z.ZodString>;
    actionData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: "new" | "viewed" | "actioned" | "dismissed" | undefined;
    priority?: "high" | "medium" | "low" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    recommendation?: string | undefined;
    actionData?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: "new" | "viewed" | "actioned" | "dismissed" | undefined;
    priority?: "high" | "medium" | "low" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    recommendation?: string | undefined;
    actionData?: Record<string, unknown> | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const InsightQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["new", "viewed", "actioned", "dismissed"]>>;
    type: z.ZodOptional<z.ZodEnum<["churn_risk", "upsell", "cross_sell", "reorder", "campaign", "general"]>>;
    priority: z.ZodOptional<z.ZodEnum<["high", "medium", "low"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    skip: z.ZodDefault<z.ZodNumber>;
    includeExpired: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    skip: number;
    limit: number;
    includeExpired: boolean;
    type?: "churn_risk" | "upsell" | "cross_sell" | "reorder" | "campaign" | "general" | undefined;
    status?: "new" | "viewed" | "actioned" | "dismissed" | undefined;
    priority?: "high" | "medium" | "low" | undefined;
}, {
    type?: "churn_risk" | "upsell" | "cross_sell" | "reorder" | "campaign" | "general" | undefined;
    status?: "new" | "viewed" | "actioned" | "dismissed" | undefined;
    skip?: number | undefined;
    priority?: "high" | "medium" | "low" | undefined;
    limit?: number | undefined;
    includeExpired?: boolean | undefined;
}>;
interface ServiceResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode: number;
}
export declare function create(data: CreateInsightDTO): Promise<ServiceResult<IInsightDocument>>;
export declare function update(id: string, data: UpdateInsightDTO): Promise<ServiceResult<IInsightDocument>>;
export declare function remove(id: string): Promise<ServiceResult<{
    deleted: boolean;
}>>;
export declare function dismiss(id: string, userId: string): Promise<ServiceResult<IInsightDocument>>;
export declare function getInsightById(id: string): Promise<ServiceResult<IInsightDocument | null>>;
export declare function getUserInsights(userId: string, query?: unknown): Promise<ServiceResult<unknown[]>>;
export declare function getMerchantInsights(merchantId: string, query?: unknown): Promise<ServiceResult<unknown[]>>;
export declare function getUserInsightCount(userId: string): Promise<ServiceResult<{
    count: number;
}>>;
export {};
//# sourceMappingURL=insightService.d.ts.map