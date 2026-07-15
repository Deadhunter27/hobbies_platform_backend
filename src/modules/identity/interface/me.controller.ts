import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import { MeResponseDto } from './dto/auth.dto';

@ApiTags('me')
@Controller({ path: 'me', version: '1' })
export class MeController {
  @Get()
  @RequiresAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The authenticated identity (loaded live, never from token claims)' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'USER_SUSPENDED', type: ErrorEnvelopeDto })
  me(@CurrentUser() actor: Actor): MeResponseDto {
    return {
      id: actor.id,
      email: actor.email,
      displayName: actor.displayName,
      globalRole: actor.globalRole,
      sessionId: actor.sessionId,
    };
  }
}
