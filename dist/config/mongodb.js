"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongoDB = connectMongoDB;
exports.disconnectMongoDB = disconnectMongoDB;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
async function connectMongoDB() {
    const { MONGODB_URI, MONGODB_USER, MONGODB_PASSWORD } = env_1.env;
    let connectionUri = MONGODB_URI;
    if (MONGODB_USER && MONGODB_PASSWORD) {
        const uriParts = MONGODB_URI.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
        if (uriParts) {
            connectionUri = `${uriParts[1]}${encodeURIComponent(MONGODB_USER)}:${encodeURIComponent(MONGODB_PASSWORD)}@${uriParts[2]}`;
        }
    }
    const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    };
    if (MONGODB_USER && MONGODB_PASSWORD) {
        options.authSource = 'admin';
    }
    try {
        await mongoose_1.default.connect(connectionUri, options);
        console.log('MongoDB connected successfully');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown MongoDB connection error';
        console.error('MongoDB connection failed:', errorMessage);
        throw error;
    }
}
async function disconnectMongoDB() {
    try {
        await mongoose_1.default.disconnect();
        console.log('MongoDB disconnected successfully');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown MongoDB disconnect error';
        console.error('MongoDB disconnect failed:', errorMessage);
        throw error;
    }
}
mongoose_1.default.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
});
mongoose_1.default.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
});
mongoose_1.default.connection.on('reconnected', () => {
    console.log('MongoDB reconnected successfully');
});
//# sourceMappingURL=mongodb.js.map