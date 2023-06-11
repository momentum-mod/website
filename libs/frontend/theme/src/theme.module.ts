import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  NbAccordionModule,
  NbActionsModule,
  NbAlertModule,
  NbButtonModule,
  NbCardModule,
  NbCheckboxModule,
  NbContextMenuModule,
  NbDatepickerModule,
  NbDialogModule,
  NbGlobalPhysicalPosition,
  NbIconModule,
  NbInputModule,
  NbLayoutModule,
  NbListModule,
  NbMenuModule,
  NbPopoverModule,
  NbProgressBarModule,
  NbRadioModule,
  NbRouteTabsetModule,
  NbSelectModule,
  NbSidebarModule,
  NbTabsetModule,
  NbThemeModule,
  NbToastrModule,
  NbUserModule
} from '@nebular/theme';
import { NbEvaIconsModule } from '@nebular/eva-icons';

const NEBULAR_MODULES = [
  NbIconModule,
  NbCardModule,
  NbLayoutModule,
  NbTabsetModule,
  NbRouteTabsetModule,
  NbMenuModule,
  NbUserModule,
  NbListModule,
  NbActionsModule,
  NbSidebarModule,
  NbCheckboxModule,
  NbRadioModule,
  NbPopoverModule,
  NbContextMenuModule,
  NbProgressBarModule,
  NbButtonModule,
  NbSelectModule,
  NbInputModule,
  NbAccordionModule,
  NbEvaIconsModule,
  NbToastrModule,
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
        ...NbSidebarModule.forRoot().providers,
        ...NbMenuModule.forRoot().providers,
        ...NbToastrModule.forRoot({
          duration: 3000,
          destroyByClick: true,
          preventDuplicates: false,
          position: NbGlobalPhysicalPosition.TOP_RIGHT
        }).providers,
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
