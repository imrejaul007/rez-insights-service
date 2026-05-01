import { Router, Request, Response, NextFunction } from 'express';
import {
  create,
  getInsightById,
  getUserInsights,
  getMerchantInsights,
  update,
  dismiss,
  remove,
  getUserInsightCount,
} from '../services/insightService';

const router = Router();

interface AsyncRequestHandler {
  (req: Request, res: Response, next: NextFunction): Promise<void>;
}

function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function sendResponse<T>(res: Response, result: { success: boolean; data?: T; error?: string; statusCode: number }) {
  if (result.success) {
    res.status(result.statusCode).json({
      success: true,
      data: result.data,
    });
  } else {
    res.status(result.statusCode).json({
      success: false,
      error: result.error,
    });
  }
}

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await create(req.body);
    sendResponse(res, result);
  })
);

router.get(
  '/user/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const query = req.query;
    const result = await getUserInsights(userId, query);
    sendResponse(res, result);
  })
);

router.get(
  '/merchant/:merchantId',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const query = req.query;
    const result = await getMerchantInsights(merchantId, query);
    sendResponse(res, result);
  })
);

router.get(
  '/user/:userId/count',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await getUserInsightCount(userId);
    sendResponse(res, result);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await getInsightById(id);
    sendResponse(res, result);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await update(id, req.body);
    sendResponse(res, result);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await remove(id);
    sendResponse(res, result);
  })
);

router.post(
  '/:id/dismiss',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required in body' });
      return;
    }
    const result = await dismiss(id, userId);
    sendResponse(res, result);
  })
);

export default router;
