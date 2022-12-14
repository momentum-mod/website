import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// This will always be behind Steam or JWT auth guard if this is reached. If JWT guard (so, every endpoint besides
// auth/steam/), request.user decodes to UserJwtPayloadVerified. For Steam, a subset of the User (Prisma) object.
export const LoggedInUser = createParamDecorator((data: string | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return data ? request.user[data] : request.user;
});
