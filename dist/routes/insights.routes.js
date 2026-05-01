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
    const result = await (0, insightService_1.createNewInsight)(req.body);
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
    const status = req.query.status;
    const result = await (0, insightService_1.getUserInsightCount)(userId, status);
    sendResponse(res, result);
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await (0, insightService_1.getInsightById)(id);
    sendResponse(res, result);
}));
router.patch('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await (0, insightService_1.updateInsightStatus)(id, req.body);
    sendResponse(res, result);
}));
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await (0, insightService_1.dismissInsightById)(id);
    sendResponse(res, result);
}));
exports.default = router;
//# sourceMappingURL=insights.routes.js.map