import { Injectable } from '@nestjs/common';

import { AgentsService } from '../agents/agents.service';
import { Agent } from '../agents/entities/agent.entity';
import { PlanningService } from '../planning/planning.service';
import { Shift } from '../planning/entities/shift.entity';

@Injectable()
export class FhirService {
    constructor(
        private readonly agentsService: AgentsService,
        private readonly planningService: PlanningService
    ) { }

    mapAgentToPractitioner(agent: Agent) {
        return {
            resourceType: 'Practitioner',
            id: agent.id.toString(),
            identifier: [
                {
                    system: 'http://annuaire.sante.fr/rpps',
                    value: agent.matricule || agent.nir || `temp-id-${agent.id}`,
                }
            ],
            name: [
                {
                    use: 'official',
                    family: agent.lastName || agent.nom,
                    given: agent.firstName ? [agent.firstName] : undefined,
                }
            ],
            telecom: [
                {
                    system: 'email',
                    value: agent.email,
                    use: 'work'
                },
                agent.telephone ? {
                    system: 'phone',
                    value: agent.telephone,
                    use: 'work'
                } : null
            ].filter(Boolean),
            gender: agent.gender === 'M' ? 'male' : agent.gender === 'F' ? 'female' : 'unknown',
            birthDate: agent.dateOfBirth ? agent.dateOfBirth.split('T')[0] : undefined,
        };
    }

    async getPractitioners(tenantId: string) {
        const agents = await this.agentsService.findAll(tenantId);
        
        return {
            resourceType: 'Bundle',
            type: 'searchset',
            total: agents.length,
            entry: agents.map(agent => ({
                fullUrl: `http://localhost/fhir/Practitioner/${agent.id}`,
                resource: this.mapAgentToPractitioner(agent)
            }))
        };
    }

    mapShiftToSlot(shift: Shift) {
        return {
            resourceType: 'Slot',
            id: shift.id.toString(),
            status: shift.status === 'VALIDATED' ? 'busy' : 'tentative',
            start: shift.start.toISOString(),
            end: shift.end.toISOString(),
            schedule: {
                reference: `Schedule/${shift.agent.id}-${shift.postId}`, // Abstract schedule representation
            },
            extension: [
                {
                    url: "http://annuaire.sante.fr/fhir/StructureDefinition/ShiftType",
                    valueString: shift.type
                }
            ]
        };
    }

    async getSlots(tenantId: string, start: Date, end: Date) {
        const shifts = await this.planningService.getShifts(tenantId, start, end);
        
        return {
            resourceType: 'Bundle',
            type: 'searchset',
            total: shifts.length,
            entry: shifts.map(shift => ({
                fullUrl: `http://localhost/fhir/Slot/${shift.id}`,
                resource: this.mapShiftToSlot(shift)
            }))
        };
    }
}
