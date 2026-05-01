"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Insight = void 0;
exports.findUserInsights = findUserInsights;
exports.findMerchantInsights = findMerchantInsights;
exports.findInsightById = findInsightById;
exports.createInsight = createInsight;
exports.updateInsight = updateInsight;
exports.deleteInsight = deleteInsight;
exports.dismissInsight = dismissInsight;
exports.countUserInsights = countUserInsights;
const mongoose_1 = __importStar(require("mongoose"));
const insightSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: [true, 'User ID is required'],
        index: true,
    },
    merchantId: {
        type: String,
        index: true,
    },
    type: {
        type: String,
        required: [true, 'Insight type is required'],
        enum: {
            values: ['churn_risk', 'upsell', 'cross_sell', 'reorder', 'campaign', 'general'],
            message: 'Invalid insight type',
        },
        index: true,
    },
    priority: {
        type: String,
        required: [true, 'Priority is required'],
        enum: {
            values: ['high', 'medium', 'low'],
            message: 'Invalid priority value',
        },
        default: 'medium',
        index: true,
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    recommendation: {
        type: String,
        required: [true, 'Recommendation is required'],
        maxlength: [2000, 'Recommendation cannot exceed 2000 characters'],
    },
    actionData: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    confidence: {
        type: Number,
        required: [true, 'Confidence score is required'],
        min: [0, 'Confidence must be between 0 and 1'],
        max: [1, 'Confidence must be between 0 and 1'],
    },
    expiresAt: {
        type: Date,
        required: [true, 'Expiration date is required'],
        index: true,
    },
    status: {
        type: String,
        required: true,
        enum: {
            values: ['new', 'viewed', 'actioned', 'dismissed'],
            message: 'Invalid status value',
        },
        default: 'new',
        index: true,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            delete ret.__v;
            return ret;
        },
    },
});
insightSchema.index({ userId: 1, status: 1 });
insightSchema.index({ merchantId: 1, status: 1 });
insightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
insightSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = new Date();
    }
    next();
});
exports.Insight = mongoose_1.default.model('Insight', insightSchema);
async function findUserInsights(userId, options = {}) {
    const { status, type, priority, limit = 50, skip = 0, includeExpired = false } = options;
    const query = { userId };
    if (status)
        query.status = status;
    if (type)
        query.type = type;
    if (priority)
        query.priority = priority;
    if (!includeExpired) {
        query.expiresAt = { $gt: new Date() };
    }
    return exports.Insight.find(query)
        .sort({ priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
}
async function findMerchantInsights(merchantId, options = {}) {
    const { status, type, priority, limit = 50, skip = 0, includeExpired = false } = options;
    const query = { merchantId };
    if (status)
        query.status = status;
    if (type)
        query.type = type;
    if (priority)
        query.priority = priority;
    if (!includeExpired) {
        query.expiresAt = { $gt: new Date() };
    }
    return exports.Insight.find(query)
        .sort({ priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
}
async function findInsightById(id) {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return null;
    }
    return exports.Insight.findById(id);
}
async function createInsight(data) {
    const insight = new exports.Insight({
        ...data,
        actionData: data.actionData || {},
        metadata: data.metadata || {},
    });
    return insight.save();
}
async function updateInsight(id, data) {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return null;
    }
    return exports.Insight.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}
async function deleteInsight(id) {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return false;
    }
    const result = await exports.Insight.findByIdAndDelete(id);
    return result !== null;
}
async function dismissInsight(id) {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return null;
    }
    return exports.Insight.findByIdAndUpdate(id, { status: 'dismissed' }, { new: true });
}
async function countUserInsights(userId, status) {
    const query = { userId, expiresAt: { $gt: new Date() } };
    if (status)
        query.status = status;
    return exports.Insight.countDocuments(query);
}
//# sourceMappingURL=Insight.js.map