import { Controller } from '@nestjs/common';

// Refresh tokens are managed internally; no public HTTP endpoints.
@Controller('refresh-tokens')
export class RefreshTokensController {}
