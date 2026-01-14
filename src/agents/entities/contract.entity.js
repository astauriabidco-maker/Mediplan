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
exports.Contract = void 0;
var typeorm_1 = require("typeorm");
var agent_entity_1 = require("./agent.entity");
var Contract = function () {
    var _classDecorators = [(0, typeorm_1.Entity)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _date_debut_decorators;
    var _date_debut_initializers = [];
    var _date_debut_extraInitializers = [];
    var _solde_conges_decorators;
    var _solde_conges_initializers = [];
    var _solde_conges_extraInitializers = [];
    var _agent_decorators;
    var _agent_initializers = [];
    var _agent_extraInitializers = [];
    var Contract = _classThis = /** @class */ (function () {
        function Contract_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.type = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _type_initializers, void 0));
            this.date_debut = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _date_debut_initializers, void 0));
            this.solde_conges = (__runInitializers(this, _date_debut_extraInitializers), __runInitializers(this, _solde_conges_initializers, void 0));
            this.agent = (__runInitializers(this, _solde_conges_extraInitializers), __runInitializers(this, _agent_initializers, void 0));
            __runInitializers(this, _agent_extraInitializers);
        }
        return Contract_1;
    }());
    __setFunctionName(_classThis, "Contract");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _type_decorators = [(0, typeorm_1.Column)()];
        _date_debut_decorators = [(0, typeorm_1.Column)()];
        _solde_conges_decorators = [(0, typeorm_1.Column)('float')];
        _agent_decorators = [(0, typeorm_1.ManyToOne)(function () { return agent_entity_1.Agent; }, function (agent) { return agent.contracts; })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
        __esDecorate(null, null, _date_debut_decorators, { kind: "field", name: "date_debut", static: false, private: false, access: { has: function (obj) { return "date_debut" in obj; }, get: function (obj) { return obj.date_debut; }, set: function (obj, value) { obj.date_debut = value; } }, metadata: _metadata }, _date_debut_initializers, _date_debut_extraInitializers);
        __esDecorate(null, null, _solde_conges_decorators, { kind: "field", name: "solde_conges", static: false, private: false, access: { has: function (obj) { return "solde_conges" in obj; }, get: function (obj) { return obj.solde_conges; }, set: function (obj, value) { obj.solde_conges = value; } }, metadata: _metadata }, _solde_conges_initializers, _solde_conges_extraInitializers);
        __esDecorate(null, null, _agent_decorators, { kind: "field", name: "agent", static: false, private: false, access: { has: function (obj) { return "agent" in obj; }, get: function (obj) { return obj.agent; }, set: function (obj, value) { obj.agent = value; } }, metadata: _metadata }, _agent_initializers, _agent_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Contract = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Contract = _classThis;
}();
exports.Contract = Contract;
