import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// For every endpoint besides Steam and socials auth, for the controller logic to be reached, the user must have passed
// the JWT guard, which decoded their access token and adds its decoded properties to the `user` property on the
// request. So this will be a UserJwtAccessPayloadVerified, i.e. id, steamID, and gameAuth, plus token stuff.
export const LoggedInUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return data
      ? data === 'steamID'
        ? BigInt(request.user[data])
        : request.user[data]
      : { ...request.user, steamID: BigInt(request.user.steamID) };
  }
);
