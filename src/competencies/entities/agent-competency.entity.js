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
exports.AgentCompetency = void 0;
var typeorm_1 = require("typeorm");
var agent_entity_1 = require("../../agents/entities/agent.entity");
var competency_entity_1 = require("./competency.entity");
var AgentCompetency = function () {
    var _classDecorators = [(0, typeorm_1.Entity)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _level_decorators;
    var _level_initializers = [];
    var _level_extraInitializers = [];
    var _expirationDate_decorators;
    var _expirationDate_initializers = [];
    var _expirationDate_extraInitializers = [];
    var _agent_decorators;
    var _agent_initializers = [];
    var _agent_extraInitializers = [];
    var _competency_decorators;
    var _competency_initializers = [];
    var _competency_extraInitializers = [];
    var AgentCompetency = _classThis = /** @class */ (function () {
        function AgentCompetency_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.level = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _level_initializers, void 0)); // 1-4
            this.expirationDate = (__runInitializers(this, _level_extraInitializers), __runInitializers(this, _expirationDate_initializers, void 0));
            this.agent = (__runInitializers(this, _expirationDate_extraInitializers), __runInitializers(this, _agent_initializers, void 0));
            this.competency = (__runInitializers(this, _agent_extraInitializers), __runInitializers(this, _competency_initializers, void 0));
            __runInitializers(this, _competency_extraInitializers);
        }
        return AgentCompetency_1;
    }());
    __setFunctionName(_classThis, "AgentCompetency");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _level_decorators = [(0, typeorm_1.Column)()];
        _expirationDate_decorators = [(0, typeorm_1.Column)({ type: 'timestamp' })];
        _agent_decorators = [(0, typeorm_1.ManyToOne)(function () { return agent_entity_1.Agent; }, function (agent) { return agent.agentCompetencies; })];
        _competency_decorators = [(0, typeorm_1.ManyToOne)(function () { return competency_entity_1.Competency; }, function (competency) { return competency.agentCompetencies; })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _level_decorators, { kind: "field", name: "level", static: false, private: false, access: { has: function (obj) { return "level" in obj; }, get: function (obj) { return obj.level; }, set: function (obj, value) { obj.level = value; } }, metadata: _metadata }, _level_initializers, _level_extraInitializers);
        __esDecorate(null, null, _expirationDate_decorators, { kind: "field", name: "expirationDate", static: false, private: false, access: { has: function (obj) { return "expirationDate" in obj; }, get: function (obj) { return obj.expirationDate; }, set: function (obj, value) { obj.expirationDate = value; } }, metadata: _metadata }, _expirationDate_initializers, _expirationDate_extraInitializers);
        __esDecorate(null, null, _agent_decorators, { kind: "field", name: "agent", static: false, private: false, access: { has: function (obj) { return "agent" in obj; }, get: function (obj) { return obj.agent; }, set: function (obj, value) { obj.agent = value; } }, metadata: _metadata }, _agent_initializers, _agent_extraInitializers);
        __esDecorate(null, null, _competency_decorators, { kind: "field", name: "competency", static: false, private: false, access: { has: function (obj) { return "competency" in obj; }, get: function (obj) { return obj.competency; }, set: function (obj, value) { obj.competency = value; } }, metadata: _metadata }, _competency_initializers, _competency_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AgentCompetency = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AgentCompetency = _classThis;
}();
exports.AgentCompetency = AgentCompetency;
