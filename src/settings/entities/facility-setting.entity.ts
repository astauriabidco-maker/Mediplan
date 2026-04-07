import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { Facility } from '../../agents/entities/facility.entity';

export enum SettingType {
    NUMBER = 'number',
    STRING = 'string',
    BOOLEAN = 'boolean',
    JSON = 'json'
}

@Entity()
@Unique(['tenantId', 'facilityId', 'key'])
export class FacilitySetting {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    key: string; // e.g., 'planning.weekly_hours_limit'

    @Column({ type: 'text' })
    value: string; // Encoded representation of the value

    @Column({
        type: 'enum',
        enum: SettingType,
        default: SettingType.STRING,
    })
    type: SettingType;

    @Column({ default: 'Par défaut' })
    description: string;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    @Column({ nullable: true })
    facilityId: number;

    @ManyToOne(() => Facility, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'facilityId' })
    facility: Facility;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
