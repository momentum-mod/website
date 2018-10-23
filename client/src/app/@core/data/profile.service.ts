import {Injectable} from '@angular/core';

export interface UserProfile {
  id: string;
  alias: string;
  avatarURL: string;
  bio?: string;
  twitterName?: string;
  discordName?: string;
  youtubeName?: string;
}
@Injectable()
export class ProfileService {
  constructor() {}
}
