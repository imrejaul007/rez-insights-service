declare const app: import("express-serve-static-core").Express;
interface ServerInstance {
    app: typeof app;
    shutdown: () => Promise<void>;
}
declare function startServer(): Promise<ServerInstance>;
export { app, startServer };
export default app;
//# sourceMappingURL=index.d.ts.map