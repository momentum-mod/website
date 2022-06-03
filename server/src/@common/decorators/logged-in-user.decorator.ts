import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// This will always be behind auth guard so user should always been in request
export const LoggedInUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user[data] : request.user;
});
