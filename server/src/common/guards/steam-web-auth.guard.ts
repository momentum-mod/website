import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SteamWebAuthGuard extends AuthGuard('steam') {}
