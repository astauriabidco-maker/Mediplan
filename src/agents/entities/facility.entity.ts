import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('facilities')
export class Facility {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    tenantId: string; // The GHT identifier

    @Column()
    name: string; // e.g. Hôpital Général, Clinique Sud

    @Column({ nullable: true })
    code: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    zipCode: string;

    @Column({ nullable: true, type: 'float' })
    latitude: number;

    @Column({ nullable: true, type: 'float' })
    longitude: number;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
