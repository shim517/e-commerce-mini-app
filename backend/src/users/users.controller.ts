import { Controller } from '@nestjs/common';

// Users are managed internally; no public HTTP endpoints.
@Controller('users')
export class UsersController {}
