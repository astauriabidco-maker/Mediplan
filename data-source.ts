import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: process.env.ENV_FILE || '.env' });

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5435', 10),
  username: process.env.POSTGRES_USER || 'nestuser',
  password: process.env.POSTGRES_PASSWORD || 'nestpassword',
  database: process.env.POSTGRES_DB || 'nestdb',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
});
