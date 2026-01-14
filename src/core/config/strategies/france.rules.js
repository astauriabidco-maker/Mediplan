"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FranceRules = void 0;
var FranceRules = /** @class */ (function () {
    function FranceRules() {
    }
    FranceRules.prototype.getWeeklyWorkLimit = function () {
        return 35;
    };
    FranceRules.prototype.supportsMobileMoney = function () {
        return false;
    };
    FranceRules.prototype.requiresOfflineMode = function () {
        return false;
    };
    return FranceRules;
}());
exports.FranceRules = FranceRules;
