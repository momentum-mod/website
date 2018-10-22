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
    'twitter.com',
    'youtube.com',
    'steamcommunity.com',
    'steampowered.com',
    'trello.com',
    'github.com',
    'poeditor.com',
    'discordapp.com',
    'momentum-mod.org',
  ];
}
