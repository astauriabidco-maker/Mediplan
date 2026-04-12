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
exports.Competency = exports.CompetencyType = void 0;
const typeorm_1 = require("typeorm");
const agent_competency_entity_1 = require("./agent-competency.entity");
var CompetencyType;
(function (CompetencyType) {
    CompetencyType["SKILL"] = "SKILL";
    CompetencyType["LEGAL_CERTIFICATION"] = "LEGAL_CERTIFICATION";
    CompetencyType["CACES"] = "CACES";
    CompetencyType["OTHER"] = "OTHER";
})(CompetencyType || (exports.CompetencyType = CompetencyType = {}));
let Competency = class Competency {
    id;
    name;
    category;
    type;
    isMandatoryToWork;
    agentCompetencies;
};
exports.Competency = Competency;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Competency.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Competency.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Competency.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: CompetencyType,
        default: CompetencyType.SKILL
    }),
    __metadata("design:type", String)
], Competency.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Competency.prototype, "isMandatoryToWork", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => agent_competency_entity_1.AgentCompetency, (agentCompetency) => agentCompetency.competency),
    __metadata("design:type", Array)
], Competency.prototype, "agentCompetencies", void 0);
exports.Competency = Competency = __decorate([
    (0, typeorm_1.Entity)()
], Competency);
//# sourceMappingURL=competency.entity.js.map