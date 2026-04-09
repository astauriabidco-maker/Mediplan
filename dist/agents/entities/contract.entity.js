"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contract = void 0;
const typeorm_1 = require("typeorm");
const agent_entity_1 = require("./agent.entity");
const contract_bonus_entity_1 = require("./contract-bonus.entity");
let Contract = class Contract {
    id;
    type;
    date_debut;
    solde_conges;
    baseSalary;
    hourlyRate;
    agent;
    bonuses;
};
exports.Contract = Contract;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Contract.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Contract.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], Contract.prototype, "date_debut", void 0);
__decorate([
    (0, typeorm_1.Column)('float'),
    __metadata("design:type", Number)
], Contract.prototype, "solde_conges", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "baseSalary", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "hourlyRate", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agent_entity_1.Agent, (agent) => agent.contracts, { onDelete: 'CASCADE' }),
    __metadata("design:type", agent_entity_1.Agent)
], Contract.prototype, "agent", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => contract_bonus_entity_1.ContractBonus, cb => cb.contract, { cascade: true }),
    __metadata("design:type", Array)
], Contract.prototype, "bonuses", void 0);
exports.Contract = Contract = __decorate([
    (0, typeorm_1.Entity)()
], Contract);
//# sourceMappingURL=contract.entity.js.map