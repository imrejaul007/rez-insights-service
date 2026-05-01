import { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyPrefix?: string;
    skipFailedRequests?: boolean;
    skip?: (req: Request) => boolean;
}
export declare function createRateLimiter(config?: Partial<RateLimitConfig>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function createUserRateLimiter(maxRequests?: number): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function createStrictRateLimiter(maxRequests?: number): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function createBulkRateLimiter(maxRequests?: number): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function ipRateLimiter(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map