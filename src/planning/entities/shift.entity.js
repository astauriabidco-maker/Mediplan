"use strict";
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
exports.Shift = void 0;
var typeorm_1 = require("typeorm");
var agent_entity_1 = require("../../agents/entities/agent.entity");
var Shift = function () {
    var _classDecorators = [(0, typeorm_1.Entity)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _start_decorators;
    var _start_initializers = [];
    var _start_extraInitializers = [];
    var _end_decorators;
    var _end_initializers = [];
    var _end_extraInitializers = [];
    var _postId_decorators;
    var _postId_initializers = [];
    var _postId_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _tenantId_decorators;
    var _tenantId_initializers = [];
    var _tenantId_extraInitializers = [];
    var _agent_decorators;
    var _agent_initializers = [];
    var _agent_extraInitializers = [];
    var Shift = _classThis = /** @class */ (function () {
        function Shift_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.start = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _start_initializers, void 0));
            this.end = (__runInitializers(this, _start_extraInitializers), __runInitializers(this, _end_initializers, void 0));
            this.postId = (__runInitializers(this, _end_extraInitializers), __runInitializers(this, _postId_initializers, void 0));
            this.status = (__runInitializers(this, _postId_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.tenantId = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _tenantId_initializers, void 0));
            this.agent = (__runInitializers(this, _tenantId_extraInitializers), __runInitializers(this, _agent_initializers, void 0));
            __runInitializers(this, _agent_extraInitializers);
        }
        return Shift_1;
    }());
    __setFunctionName(_classThis, "Shift");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _start_decorators = [(0, typeorm_1.Column)({ type: 'timestamp' })];
        _end_decorators = [(0, typeorm_1.Column)({ type: 'timestamp' })];
        _postId_decorators = [(0, typeorm_1.Column)()];
        _status_decorators = [(0, typeorm_1.Column)({ default: 'PLANNED' })];
        _tenantId_decorators = [(0, typeorm_1.Column)({ default: 'DEFAULT_TENANT' })];
        _agent_decorators = [(0, typeorm_1.ManyToOne)(function () { return agent_entity_1.Agent; }, function (agent) { return agent.shifts; })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _start_decorators, { kind: "field", name: "start", static: false, private: false, access: { has: function (obj) { return "start" in obj; }, get: function (obj) { return obj.start; }, set: function (obj, value) { obj.start = value; } }, metadata: _metadata }, _start_initializers, _start_extraInitializers);
        __esDecorate(null, null, _end_decorators, { kind: "field", name: "end", static: false, private: false, access: { has: function (obj) { return "end" in obj; }, get: function (obj) { return obj.end; }, set: function (obj, value) { obj.end = value; } }, metadata: _metadata }, _end_initializers, _end_extraInitializers);
        __esDecorate(null, null, _postId_decorators, { kind: "field", name: "postId", static: false, private: false, access: { has: function (obj) { return "postId" in obj; }, get: function (obj) { return obj.postId; }, set: function (obj, value) { obj.postId = value; } }, metadata: _metadata }, _postId_initializers, _postId_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _tenantId_decorators, { kind: "field", name: "tenantId", static: false, private: false, access: { has: function (obj) { return "tenantId" in obj; }, get: function (obj) { return obj.tenantId; }, set: function (obj, value) { obj.tenantId = value; } }, metadata: _metadata }, _tenantId_initializers, _tenantId_extraInitializers);
        __esDecorate(null, null, _agent_decorators, { kind: "field", name: "agent", static: false, private: false, access: { has: function (obj) { return "agent" in obj; }, get: function (obj) { return obj.agent; }, set: function (obj, value) { obj.agent = value; } }, metadata: _metadata }, _agent_initializers, _agent_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Shift = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Shift = _classThis;
}();
exports.Shift = Shift;
