"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStandardError = createStandardError;
function createStandardError(code, message, details) {
    const error = new Error(message);
    error.code = code;
    if (details !== undefined) {
        error.details = details;
    }
    return error;
}
