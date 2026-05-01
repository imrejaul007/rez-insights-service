import { Request, Response, NextFunction } from 'express';
export interface JWTPayload {
    userId: string;
    merchantId?: string;
    role: 'user' | 'merchant' | 'admin' | 'system';
    iat?: number;
    exp?: number;
}
export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
}
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}
export declare function extractToken(req: Request): string | null;
export declare function verifyToken(token: string): JWTPayload | null;
export declare function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: Array<'user' | 'merchant' | 'admin' | 'system'>): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare function requireUserOwnership(paramName?: string): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string;
export declare function generateSystemToken(userId: string, merchantId?: string): string;
//# sourceMappingURL=auth.d.ts.map