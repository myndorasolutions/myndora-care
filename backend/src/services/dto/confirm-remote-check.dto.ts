import { IsString, Length } from 'class-validator';

export class ConfirmRemoteCheckDto {
  @IsString()
  @Length(4, 8)
  patientConfirmationOtp!: string;
}
