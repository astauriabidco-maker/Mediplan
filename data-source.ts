import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Agent } from './src/agents/entities/agent.entity';
import { Contract } from './src/agents/entities/contract.entity';
import { Competency } from './src/competencies/entities/competency.entity';
import { AgentCompetency } from './src/competencies/entities/agent-competency.entity';
import { Shift } from './src/planning/entities/shift.entity';
import { WorkPolicy } from './src/planning/entities/work-policy.entity';
import { AgentAlert } from './src/agents/entities/agent-alert.entity';

config();

export default new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5435', 10),
    username: process.env.POSTGRES_USER || 'nestuser',
    password: process.env.POSTGRES_PASSWORD || 'nestpassword',
    database: process.env.POSTGRES_DB || 'nestdb',
    entities: [Agent, Contract, Competency, AgentCompetency, Shift, WorkPolicy, AgentAlert],
    migrations: ['./src/migrations/*.ts'],
});
