import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  NbAccordionModule,
  NbAlertModule,
  NbDatepickerModule,
  NbListModule,
  NbRadioModule,
  NbThemeModule,
  NbUserModule
} from '@nebular/theme';

const NEBULAR_MODULES = [
  NbUserModule,
  NbListModule,
  NbRadioModule,
  NbAccordionModule,
  NbAlertModule
];

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ...NEBULAR_MODULES],
  exports: NEBULAR_MODULES
})
export class ThemeModule {
  static forRoot(): ModuleWithProviders<ThemeModule> {
    return {
      ngModule: ThemeModule,
      providers: [
        ...NbThemeModule.forRoot({ name: 'momentum' }, [
          { name: 'momentum', base: 'dark' }
        ]).providers,
        ...NbDatepickerModule.forRoot().providers
      ]
    };
  }
}
