import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class SteamWebAuthGuard extends AuthGuard('steam') {
    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const referrer = request.query?.r;
        // TODO: This referral system doesn't work. I've spent DAYS dicking around but setting stuff on the Request
        // Whatever way I approach it, the request that calls returnURL is different from the one I'm manipulating
        // but the old API has essentially the exact strategy, so I have NO IDEA why that works and this doesn't.
        // Plus if we switch to Fastify this'll be different anyway.

        // Frontend passes this as "r" which is a horrible name. Could rename it, for now just renaming here.
        if (request && referrer)
            request.session ? (request.session.referrer = referrer) : (request.session = { referrer: referrer });

        return super.canActivate(context);
    }
}
