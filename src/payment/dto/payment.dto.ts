import { IsInt, IsNumber, IsPositive, Max } from 'class-validator';

export class TriggerPaymentDto {
  @IsInt()
  @IsPositive()
  agentId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1000000)
  amount: number;
}
