"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var typeorm_1 = require("typeorm");
var dotenv_1 = require("dotenv");
var agent_entity_1 = require("./src/agents/entities/agent.entity");
var contract_entity_1 = require("./src/agents/entities/contract.entity");
var competency_entity_1 = require("./src/competencies/entities/competency.entity");
var agent_competency_entity_1 = require("./src/competencies/entities/agent-competency.entity");
var shift_entity_1 = require("./src/planning/entities/shift.entity");
(0, dotenv_1.config)();
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5435', 10),
    username: process.env.POSTGRES_USER || 'nestuser',
    password: process.env.POSTGRES_PASSWORD || 'nestpassword',
    database: process.env.POSTGRES_DB || 'nestdb',
    entities: [agent_entity_1.Agent, contract_entity_1.Contract, competency_entity_1.Competency, agent_competency_entity_1.AgentCompetency, shift_entity_1.Shift],
    migrations: ['./src/migrations/*.ts'],
});
