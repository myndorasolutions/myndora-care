import { SetMetadata } from '@nestjs/common';
import { ChwActivationLevel } from '@prisma/client';

export const CHW_ACTIVATION_KEY = 'chw_activation_level';
export const RequireChwActivation = (level: ChwActivationLevel) =>
  SetMetadata(CHW_ACTIVATION_KEY, level);
