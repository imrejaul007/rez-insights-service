"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const insightService_1 = require("../services/insightService");
const router = (0, express_1.Router)();
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
function sendResponse(res, result) {
    if (result.success) {
        res.status(result.statusCode).json({
            success: true,
            data: result.data,
        });
    }
    else {
        res.status(result.statusCode).json({
            success: false,
            error: result.error,
        });
    }
}
router.post('/', asyncHandler(async (req, res) => {
    const result = await (0, insightService_1.create)(req.body);
    sendResponse(res, result);
}));
router.get('/user/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const query = req.query;
    const result = await (0, insightService_1.getUserInsights)(userId, query);
    sendResponse(res, result);
}));
router.get('/merchant/:merchantId', asyncHandler(async (req, res) => {
    const { merchantId } = req.params;
    const query = req.query;
    const result = await (0, insightService_1.getMerchantInsights)(merchantId, query);
    sendResponse(res, result);
}));
router.get('/user/:userId/count', asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const result = await (0, insightService_1.getUserInsightCount)(userId);
    sendResponse(res, result);
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await (0, insightService_1.getInsightById)(id);
    sendResponse(res, result);
}));
router.patch('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await (0, insightService_1.update)(id, req.body);
    sendResponse(res, result);
}));
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await (0, insightService_1.remove)(id);
    sendResponse(res, result);
}));
router.post('/:id/dismiss', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required in body' });
        return;
    }
    const result = await (0, insightService_1.dismiss)(id, userId);
    sendResponse(res, result);
}));
exports.default = router;
//# sourceMappingURL=insights.routes.js.map