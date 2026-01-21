
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Agent } from './src/agents/entities/agent.entity';
import { Shift } from './src/planning/entities/shift.entity';
import { Repository, DataSource } from 'typeorm';
import { addDays, startOfWeek, setHours, setMinutes } from 'date-fns';

async function bootstrap() {
    console.log('🌙 Starting Astreinte seed...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const agentRepo = app.get<Repository<Agent>>(getRepositoryToken(Agent));
    const shiftRepo = app.get<Repository<Shift>>(getRepositoryToken(Shift));

    const tenantId = 'HGD-DOUALA';

    // Find the surgeon (Chef Chirurgie) to assign on-call
    const doctor = await agentRepo.findOne({
        where: { email: 'p.mbarga@hgd-douala.cm', tenantId }
    });

    if (!doctor) {
        console.error('❌ Chef Chirurgie not found. Run seed:hgd first.');
        process.exit(1);
    }

    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday

    // Create 3 Night Guards (Astreintes) for this week
    const shifts = [];

    // Monday Night
    shifts.push(shiftRepo.create({
        start: setHours(setMinutes(addDays(startOfCurrentWeek, 0), 20), 0), // 20:00
        end: setHours(setMinutes(addDays(startOfCurrentWeek, 1), 8), 0),   // 08:00 next day
        postId: 'MEDECIN_GARDE',
        status: 'VALIDATED',
        agent: doctor,
        tenantId
    }));

    // Wednesday Night
    shifts.push(shiftRepo.create({
        start: setHours(setMinutes(addDays(startOfCurrentWeek, 2), 20), 0),
        end: setHours(setMinutes(addDays(startOfCurrentWeek, 3), 8), 0),
        postId: 'MEDECIN_GARDE',
        status: 'VALIDATED',
        agent: doctor,
        tenantId
    }));

    // Saturday 24h Guard (Weekend)
    shifts.push(shiftRepo.create({
        start: setHours(setMinutes(addDays(startOfCurrentWeek, 5), 8), 0),
        end: setHours(setMinutes(addDays(startOfCurrentWeek, 6), 8), 0),
        postId: 'MEDECIN_GARDE',
        status: 'VALIDATED',
        agent: doctor,
        tenantId
    }));

    await shiftRepo.save(shifts);

    console.log(`✅ Created ${shifts.length} Astreinte shifts for ${doctor.nom}`);
    await app.close();
}

bootstrap().catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
});
