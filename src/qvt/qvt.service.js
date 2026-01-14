"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QvtService = void 0;
var common_1 = require("@nestjs/common");
var QvtService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var QvtService = _classThis = /** @class */ (function () {
        function QvtService_1() {
            this.logger = new common_1.Logger(QvtService.name);
        }
        QvtService_1.prototype.calculateFatigueScore = function (shifts) {
            // 1. Sort shifts chronologically
            var sortedShifts = shifts.map(function (s) { return (__assign(__assign({}, s), { start: new Date(s.start), end: new Date(s.end) })); }).sort(function (a, b) { return a.start.getTime() - b.start.getTime(); });
            var nbNights = 0;
            var nbLongShifts = 0;
            var hoursRest = 0;
            for (var i = 0; i < sortedShifts.length; i++) {
                var shift = sortedShifts[i];
                var durationHours = (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);
                // Check Long Shift (> 10h)
                if (durationHours > 10) {
                    nbLongShifts++;
                }
                // Check Night Shift (> 3h between 22h and 06h)
                if (this.isNightShift(shift.start, shift.end)) {
                    nbNights++;
                }
                // Calculate Rest (Difference between current start and previous end)
                if (i > 0) {
                    var prevShift = sortedShifts[i - 1];
                    var restDuration = (shift.start.getTime() - prevShift.end.getTime()) / (1000 * 60 * 60);
                    if (restDuration > 0) {
                        hoursRest += restDuration;
                    }
                }
            }
            // Formula: (NbNuits * 2) + (NbLongShifts * 1.5) - (HeuresRepos * 0.5)
            var score = (nbNights * 2) + (nbLongShifts * 1.5) - (hoursRest * 0.5);
            var alert = score > 5;
            if (alert) {
                this.logger.warn("RISK_ALERT: Fatigue score ".concat(score, " exceeds threshold! (Nights: ").concat(nbNights, ", Long: ").concat(nbLongShifts, ", Rest: ").concat(hoursRest, "h)"));
            }
            return {
                score: score,
                metrics: { nbNights: nbNights, nbLongShifts: nbLongShifts, hoursRest: hoursRest },
                alert: alert
            };
        };
        QvtService_1.prototype.isNightShift = function (start, end) {
            // Simple overlap check with 22h-06h window(s)
            // Check overlap duration in hours
            var nightStart = 22;
            var nightEnd = 6;
            var overlapMinutes = 0;
            var current = new Date(start.getTime());
            while (current < end) {
                var h = current.getHours();
                // Is it night hour? (>= 22 or < 6)
                if (h >= nightStart || h < nightEnd) {
                    overlapMinutes++; // Granularity: minute
                }
                current.setMinutes(current.getMinutes() + 1);
            }
            return (overlapMinutes / 60) >= 3;
        };
        return QvtService_1;
    }());
    __setFunctionName(_classThis, "QvtService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        QvtService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return QvtService = _classThis;
}();
exports.QvtService = QvtService;
