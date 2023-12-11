import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  NbAccordionModule,
  NbActionsModule,
  NbAlertModule,
  NbCheckboxModule,
  NbContextMenuModule,
  NbDatepickerModule,
  NbDialogModule,
  NbLayoutModule,
  NbListModule,
  NbMenuModule,
  NbProgressBarModule,
  NbRadioModule,
  NbRouteTabsetModule,
  NbSelectModule,
  NbSidebarModule,
  NbTabsetModule,
  NbThemeModule,
  NbUserModule
} from '@nebular/theme';

const NEBULAR_MODULES = [
  NbLayoutModule,
  NbTabsetModule,
  NbRouteTabsetModule,
  NbMenuModule,
  NbUserModule,
  NbListModule,
  NbActionsModule,
  NbCheckboxModule,
  NbRadioModule,
  NbContextMenuModule,
  NbProgressBarModule,
  NbSelectModule,
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
        ...NbMenuModule.forRoot().providers,
        ...NbDialogModule.forRoot({
          hasBackdrop: true,
          closeOnBackdropClick: true,
          closeOnEsc: true,
          autoFocus: true
        }).providers,
        ...NbDatepickerModule.forRoot().providers
      ]
    };
  }
}
