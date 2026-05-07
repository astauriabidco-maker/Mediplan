import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ArrayNotEmpty,
} from 'class-validator';

export const OPS_ROUTINE_IDS = [
  'daily',
  'weekly',
  'escalation',
  'backup',
  'audit',
  'slo',
] as const;

export const OPS_ROUTINE_MODES = [
  'disabled',
  'dry-run',
  'mock',
  'api',
] as const;

export type OpsRoutineId = (typeof OPS_ROUTINE_IDS)[number];
export type OpsRoutineMode = (typeof OPS_ROUTINE_MODES)[number];

export class RunOpsRoutineSchedulerDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(OPS_ROUTINE_IDS, { each: true })
  routines?: OpsRoutineId[];

  @IsOptional()
  @IsIn(OPS_ROUTINE_MODES)
  mode?: OpsRoutineMode;

  @IsOptional()
  @IsString()
  reportDir?: string;

  @IsOptional()
  @IsString()
  journalPath?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  incidentId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}
