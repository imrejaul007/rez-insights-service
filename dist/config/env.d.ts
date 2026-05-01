export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: string;
    MONGODB_URI: string;
    REDIS_HOST: string;
    REDIS_PORT: string;
    REDIS_TLS: string;
    JWT_SECRET: string;
    RATE_LIMIT_WINDOW_MS: string;
    RATE_LIMIT_MAX_REQUESTS: string;
    INSIGHT_CACHE_TTL_SECONDS: string;
    MONGODB_USER?: string | undefined;
    MONGODB_PASSWORD?: string | undefined;
    REDIS_PASSWORD?: string | undefined;
};
export declare const isProduction: boolean;
export declare const isDevelopment: boolean;
export declare const isTest: boolean;
//# sourceMappingURL=env.d.ts.map