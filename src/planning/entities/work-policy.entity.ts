import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Grade } from '../../agents/entities/grade.entity';
import { HospitalService } from '../../agents/entities/hospital-service.entity';

@Index('IDX_work_policy_tenant_default_unique', ['tenantId'], { unique: true, where: '"hospitalServiceId" IS NULL AND "gradeId" IS NULL' })
@Index('IDX_work_policy_tenant_service_unique', ['tenantId', 'hospitalServiceId'], { unique: true, where: '"hospitalServiceId" IS NOT NULL AND "gradeId" IS NULL' })
@Index('IDX_work_policy_tenant_grade_unique', ['tenantId', 'gradeId'], { unique: true, where: '"hospitalServiceId" IS NULL AND "gradeId" IS NOT NULL' })
@Index('IDX_work_policy_tenant_service_grade_unique', ['tenantId', 'hospitalServiceId', 'gradeId'], { unique: true, where: '"hospitalServiceId" IS NOT NULL AND "gradeId" IS NOT NULL' })
@Entity()
export class WorkPolicy {
    @PrimaryGeneratedColumn()
    id: number;

    // --- CONTEXTE (Entonnoir) ---

    @Column({ nullable: true })
    hospitalServiceId: number | null;

    @ManyToOne(() => HospitalService, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'hospitalServiceId' })
    hospitalService: HospitalService;

    @Column({ nullable: true })
    gradeId: number | null;

    @ManyToOne(() => Grade, (grade) => grade.workPolicies, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'gradeId' })
    grade: Grade;

    // --- RÈGLES ---

    @Column({ type: 'int', default: 24 }) // Default to 24h as per LocaleRules
    restHoursAfterGuard: number; // e.g. 11h (EU), 24h, 48h

    @Column({ type: 'int', default: 24 })
    maxGuardDuration: number; // e.g., 24h

    @Column({ type: 'int', default: 48 })
    maxWeeklyHours: number; // e.g., 48h legal weekly cap

    @Column({ type: 'float', default: 0 })
    onCallCompensationPercent: number; // e.g., 0.5 (50%), 1.0 (100%)

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;
}
