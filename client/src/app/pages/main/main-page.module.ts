import {NgModule} from '@angular/core';
import {MainPageComponent} from './main-page.component';
import {AboutComponent} from './about/about.component';
import {CreditsComponent} from './credits/credits.component';
import {HeaderComponent} from './header/header.component';
import {FooterComponent} from './footer/footer.component';
import {NavComponent} from './nav/nav.component';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {GalleryModule} from '@ngx-gallery/core';
import {NbButtonModule, NbLayoutModule} from '@nebular/theme';
import { GamemodesComponent } from './gamemodes/gamemodes.component';
import { GamemodeComponent } from './gamemodes/gamemode/gamemode.component';

@NgModule({
  imports: [CommonModule, RouterModule, NbLayoutModule, NbButtonModule, GalleryModule],
  declarations: [
    MainPageComponent,
    AboutComponent,
    CreditsComponent,
    HeaderComponent,
    FooterComponent,
    NavComponent,
    GamemodesComponent,
    GamemodeComponent,
  ],
})
export class MainPageModule {
}
