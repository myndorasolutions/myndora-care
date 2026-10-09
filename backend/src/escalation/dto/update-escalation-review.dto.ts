import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateEscalationReviewDto {
  @IsIn(['needs_review', 'reviewed', 'closed'])
  status!: 'needs_review' | 'reviewed' | 'closed';

  @IsOptional()
  @IsString()
  clinician_notes?: string;
}
