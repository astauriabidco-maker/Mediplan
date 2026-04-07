import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ghts')
export class Ght {
    // We use a custom string ID ex: GHT_PARIS_01 avoiding integer auto-increment for tenant IDs
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column()
    region: string;

    @Column({ nullable: true })
    contactEmail: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
