import mongoose, { Document, Model } from 'mongoose';
export type InsightType = 'churn_risk' | 'upsell' | 'cross_sell' | 'reorder' | 'campaign' | 'general';
export type InsightPriority = 'high' | 'medium' | 'low';
export type InsightStatus = 'new' | 'viewed' | 'actioned' | 'dismissed';
export interface IInsight {
    userId: string;
    merchantId?: string;
    type: InsightType;
    priority: InsightPriority;
    title: string;
    description: string;
    recommendation: string;
    actionData: Record<string, unknown>;
    confidence: number;
    expiresAt: Date;
    status: InsightStatus;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export interface IInsightDocument extends IInsight, Document {
    _id: mongoose.Types.ObjectId;
    id: string;
}
export interface CreateInsightDTO {
    userId: string;
    merchantId?: string;
    type: InsightType;
    priority: InsightPriority;
    title: string;
    description: string;
    recommendation: string;
    actionData?: Record<string, unknown>;
    confidence: number;
    expiresAt: Date;
    metadata?: Record<string, unknown>;
}
export interface UpdateInsightDTO {
    status?: InsightStatus;
    priority?: InsightPriority;
    title?: string;
    description?: string;
    recommendation?: string;
    actionData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}
export interface InsightQueryOptions {
    status?: InsightStatus;
    type?: InsightType;
    priority?: InsightPriority;
    limit?: number;
    skip?: number;
    includeExpired?: boolean;
}
export declare const Insight: Model<IInsightDocument>;
export declare function findUserInsights(userId: string, options?: InsightQueryOptions): Promise<IInsightDocument[]>;
export declare function findMerchantInsights(merchantId: string, options?: InsightQueryOptions): Promise<IInsightDocument[]>;
export declare function findInsightById(id: string): Promise<IInsightDocument | null>;
export declare function createInsight(data: CreateInsightDTO): Promise<IInsightDocument>;
export declare function updateInsight(id: string, data: UpdateInsightDTO): Promise<IInsightDocument | null>;
export declare function deleteInsight(id: string): Promise<boolean>;
export declare function dismissInsight(id: string): Promise<IInsightDocument | null>;
export declare function countUserInsights(userId: string, status?: InsightStatus): Promise<number>;
//# sourceMappingURL=Insight.d.ts.map