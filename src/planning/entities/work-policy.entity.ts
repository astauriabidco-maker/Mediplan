import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Grade } from '../../agents/entities/grade.entity';
import { HospitalService } from '../../agents/entities/hospital-service.entity';

@Entity()
export class WorkPolicy {
    @PrimaryGeneratedColumn()
    id: number;

    // --- CONTEXTE (Entonnoir) ---

    @Column({ nullable: true })
    hospitalServiceId: number;

    @ManyToOne(() => HospitalService, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'hospitalServiceId' })
    hospitalService: HospitalService;

    @Column({ nullable: true })
    gradeId: number;

    @ManyToOne(() => Grade, (grade) => grade.workPolicies, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'gradeId' })
    grade: Grade;

    // --- RÈGLES ---

    @Column({ type: 'int', default: 24 }) // Default to 24h as per LocaleRules
    restHoursAfterGuard: number; // e.g. 11h (EU), 24h, 48h

    @Column({ type: 'int', default: 24 })
    maxGuardDuration: number; // e.g., 24h

    @Column({ type: 'float', default: 0 })
    onCallCompensationPercent: number; // e.g., 0.5 (50%), 1.0 (100%)

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;
}
