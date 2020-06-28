import {NgModule} from '@angular/core';
import {OutgoingComponent} from './outgoing.component';
import {ThemeModule} from '../../@theme/theme.module';

@NgModule({
  imports: [ThemeModule],
  declarations: [OutgoingComponent],
  exports: [OutgoingComponent],
})
export class OutgoingModule {
  static readonly whitelistedOutgoingDomains: string[] = [
    window.location.host,
    'twitter.com',
    'twitch.tv',
    'youtube.com',
    'youtu.be',
    'reddit.com',
    'gitlab.com',
    'bitbucket.org',
    'patreon.com',
    'itch.io',
    'gamebanana.com',
    'soundcloud.com',
    'spotify.com',
    'steamcommunity.com',
    'steampowered.com',
    'trello.com',
    'github.com',
    'poeditor.com',
    'discordapp.com',
    'discord.gg',
    'momentum-mod.org',
  ];
  static readonly whitelistedOutgoingProtocols: string[] = [
    'blob',
  ];
}
