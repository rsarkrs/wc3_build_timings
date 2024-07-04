"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayParser = void 0;
const W3GReplay_1 = __importDefault(require("./W3GReplay"));
const ReplayParser_1 = __importDefault(require("./parsers/ReplayParser"));
exports.ReplayParser = ReplayParser_1.default;
exports.default = W3GReplay_1.default;
//# sourceMappingURL=index.js.map