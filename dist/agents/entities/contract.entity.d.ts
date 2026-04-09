import { Agent } from './agent.entity';
import { ContractBonus } from './contract-bonus.entity';
export declare class Contract {
    id: number;
    type: string;
    date_debut: Date;
    solde_conges: number;
    baseSalary: number;
    hourlyRate: number;
    agent: Agent;
    bonuses: ContractBonus[];
}
