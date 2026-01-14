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
exports.Agent = void 0;
var typeorm_1 = require("typeorm");
var contract_entity_1 = require("./contract.entity");
var agent_competency_entity_1 = require("../../competencies/entities/agent-competency.entity");
var shift_entity_1 = require("../../planning/entities/shift.entity");
var Agent = function () {
    var _classDecorators = [(0, typeorm_1.Entity)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _nom_decorators;
    var _nom_initializers = [];
    var _nom_extraInitializers = [];
    var _email_decorators;
    var _email_initializers = [];
    var _email_extraInitializers = [];
    var _matricule_decorators;
    var _matricule_initializers = [];
    var _matricule_extraInitializers = [];
    var _telephone_decorators;
    var _telephone_initializers = [];
    var _telephone_extraInitializers = [];
    var _password_decorators;
    var _password_initializers = [];
    var _password_extraInitializers = [];
    var _tenantId_decorators;
    var _tenantId_initializers = [];
    var _tenantId_extraInitializers = [];
    var _contracts_decorators;
    var _contracts_initializers = [];
    var _contracts_extraInitializers = [];
    var _agentCompetencies_decorators;
    var _agentCompetencies_initializers = [];
    var _agentCompetencies_extraInitializers = [];
    var _shifts_decorators;
    var _shifts_initializers = [];
    var _shifts_extraInitializers = [];
    var Agent = _classThis = /** @class */ (function () {
        function Agent_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.nom = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _nom_initializers, void 0));
            this.email = (__runInitializers(this, _nom_extraInitializers), __runInitializers(this, _email_initializers, void 0));
            this.matricule = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _matricule_initializers, void 0));
            this.telephone = (__runInitializers(this, _matricule_extraInitializers), __runInitializers(this, _telephone_initializers, void 0));
            this.password = (__runInitializers(this, _telephone_extraInitializers), __runInitializers(this, _password_initializers, void 0));
            this.tenantId = (__runInitializers(this, _password_extraInitializers), __runInitializers(this, _tenantId_initializers, void 0));
            this.contracts = (__runInitializers(this, _tenantId_extraInitializers), __runInitializers(this, _contracts_initializers, void 0));
            this.agentCompetencies = (__runInitializers(this, _contracts_extraInitializers), __runInitializers(this, _agentCompetencies_initializers, void 0));
            this.shifts = (__runInitializers(this, _agentCompetencies_extraInitializers), __runInitializers(this, _shifts_initializers, void 0));
            __runInitializers(this, _shifts_extraInitializers);
        }
        return Agent_1;
    }());
    __setFunctionName(_classThis, "Agent");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _nom_decorators = [(0, typeorm_1.Column)()];
        _email_decorators = [(0, typeorm_1.Column)({ unique: true })];
        _matricule_decorators = [(0, typeorm_1.Column)({ unique: true })];
        _telephone_decorators = [(0, typeorm_1.Column)()];
        _password_decorators = [(0, typeorm_1.Column)({ select: false, nullable: true })];
        _tenantId_decorators = [(0, typeorm_1.Column)({ default: 'DEFAULT_TENANT' })];
        _contracts_decorators = [(0, typeorm_1.OneToMany)(function () { return contract_entity_1.Contract; }, function (contract) { return contract.agent; })];
        _agentCompetencies_decorators = [(0, typeorm_1.OneToMany)(function () { return agent_competency_entity_1.AgentCompetency; }, function (agentCompetency) { return agentCompetency.agent; })];
        _shifts_decorators = [(0, typeorm_1.OneToMany)(function () { return shift_entity_1.Shift; }, function (shift) { return shift.agent; })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _nom_decorators, { kind: "field", name: "nom", static: false, private: false, access: { has: function (obj) { return "nom" in obj; }, get: function (obj) { return obj.nom; }, set: function (obj, value) { obj.nom = value; } }, metadata: _metadata }, _nom_initializers, _nom_extraInitializers);
        __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: function (obj) { return "email" in obj; }, get: function (obj) { return obj.email; }, set: function (obj, value) { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
        __esDecorate(null, null, _matricule_decorators, { kind: "field", name: "matricule", static: false, private: false, access: { has: function (obj) { return "matricule" in obj; }, get: function (obj) { return obj.matricule; }, set: function (obj, value) { obj.matricule = value; } }, metadata: _metadata }, _matricule_initializers, _matricule_extraInitializers);
        __esDecorate(null, null, _telephone_decorators, { kind: "field", name: "telephone", static: false, private: false, access: { has: function (obj) { return "telephone" in obj; }, get: function (obj) { return obj.telephone; }, set: function (obj, value) { obj.telephone = value; } }, metadata: _metadata }, _telephone_initializers, _telephone_extraInitializers);
        __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: function (obj) { return "password" in obj; }, get: function (obj) { return obj.password; }, set: function (obj, value) { obj.password = value; } }, metadata: _metadata }, _password_initializers, _password_extraInitializers);
        __esDecorate(null, null, _tenantId_decorators, { kind: "field", name: "tenantId", static: false, private: false, access: { has: function (obj) { return "tenantId" in obj; }, get: function (obj) { return obj.tenantId; }, set: function (obj, value) { obj.tenantId = value; } }, metadata: _metadata }, _tenantId_initializers, _tenantId_extraInitializers);
        __esDecorate(null, null, _contracts_decorators, { kind: "field", name: "contracts", static: false, private: false, access: { has: function (obj) { return "contracts" in obj; }, get: function (obj) { return obj.contracts; }, set: function (obj, value) { obj.contracts = value; } }, metadata: _metadata }, _contracts_initializers, _contracts_extraInitializers);
        __esDecorate(null, null, _agentCompetencies_decorators, { kind: "field", name: "agentCompetencies", static: false, private: false, access: { has: function (obj) { return "agentCompetencies" in obj; }, get: function (obj) { return obj.agentCompetencies; }, set: function (obj, value) { obj.agentCompetencies = value; } }, metadata: _metadata }, _agentCompetencies_initializers, _agentCompetencies_extraInitializers);
        __esDecorate(null, null, _shifts_decorators, { kind: "field", name: "shifts", static: false, private: false, access: { has: function (obj) { return "shifts" in obj; }, get: function (obj) { return obj.shifts; }, set: function (obj, value) { obj.shifts = value; } }, metadata: _metadata }, _shifts_initializers, _shifts_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Agent = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Agent = _classThis;
}();
exports.Agent = Agent;
