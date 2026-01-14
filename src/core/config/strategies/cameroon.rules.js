"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CameroonRules = void 0;
var CameroonRules = /** @class */ (function () {
    function CameroonRules() {
    }
    CameroonRules.prototype.getWeeklyWorkLimit = function () {
        return 40;
    };
    CameroonRules.prototype.supportsMobileMoney = function () {
        return true;
    };
    CameroonRules.prototype.requiresOfflineMode = function () {
        return true;
    };
    return CameroonRules;
}());
exports.CameroonRules = CameroonRules;
