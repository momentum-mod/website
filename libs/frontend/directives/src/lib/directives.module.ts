import { NgModule } from '@angular/core';
import { NbTabIconDirective } from './icons/nb-tab-icon.directive';
import { NbIconIconDirective } from './icons/nb-icon-icon.directive';

const DIRECTIVES = [NbIconIconDirective, NbTabIconDirective];

@NgModule({
  declarations: DIRECTIVES,
  exports: DIRECTIVES
})
export class DirectivesModule {}
