"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractToken = extractToken;
exports.verifyToken = verifyToken;
exports.authMiddleware = authMiddleware;
exports.optionalAuthMiddleware = optionalAuthMiddleware;
exports.requireRole = requireRole;
exports.requireUserOwnership = requireUserOwnership;
exports.generateToken = generateToken;
exports.generateSystemToken = generateSystemToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return null;
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }
    return parts[1];
}
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        return decoded;
    }
    catch (error) {
        return null;
    }
}
function authMiddleware(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        res.status(401).json({
            success: false,
            error: 'Authentication required: No token provided',
        });
        return;
    }
    const payload = verifyToken(token);
    if (!payload) {
        res.status(401).json({
            success: false,
            error: 'Authentication required: Invalid or expired token',
        });
        return;
    }
    req.user = payload;
    next();
}
function optionalAuthMiddleware(req, res, next) {
    const token = extractToken(req);
    if (token) {
        const payload = verifyToken(token);
        if (payload) {
            req.user = payload;
        }
    }
    next();
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: `Access denied: Required role(s): ${roles.join(', ')}`,
            });
            return;
        }
        next();
    };
}
function requireUserOwnership(paramName = 'userId') {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
            });
            return;
        }
        if (req.user.role === 'admin' || req.user.role === 'system') {
            next();
            return;
        }
        const resourceUserId = req.params[paramName];
        if (req.user.userId !== resourceUserId) {
            res.status(403).json({
                success: false,
                error: 'Access denied: You do not have permission to access this resource',
            });
            return;
        }
        next();
    };
}
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, { expiresIn: '24h' });
}
function generateSystemToken(userId, merchantId) {
    return jsonwebtoken_1.default.sign({
        userId,
        merchantId,
        role: 'system',
    }, env_1.env.JWT_SECRET, { expiresIn: '1h' });
}
//# sourceMappingURL=auth.js.map