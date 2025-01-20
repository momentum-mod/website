import {
  CommonModule,
  DatePipe,
  JsonPipe,
  KeyValuePipe,
  NgOptimizedImage
} from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { AvatarComponent } from './components/avatar/avatar.component';
import { UserComponent } from './components/user/user.component';
import { IconComponent } from './icons/icon.component';
import { CardComponent } from './components/card/card.component';
import { CardHeaderComponent } from './components/card/card-header.component';
import { CardBodyComponent } from './components/card/card-body.component';
import { TooltipDirective } from './directives/tooltip.directive';
import { SpinnerDirective } from './directives/spinner.directive';
import { RangePipe } from './pipes/range.pipe';
import { EnumValuePipe } from './pipes/enum-value.pipe';
import { NumberWithCommasPipe } from './pipes/number-with-commas.pipe';
import { PluralPipe } from './pipes/plural.pipe';
import { ThousandsSuffixPipe } from './pipes/thousands-suffix.pipe';
import { TimeAgoPipe } from './pipes/time-ago.pipe';
import { TimingPipe } from './pipes/timing.pipe';
import { UnsortedKeyvaluePipe } from './pipes/unsorted-keyvalue.pipe';
import { TextareaAllowEnterDirective } from './directives/textarea-allow-enter.directive';

const SHARED = [
  CommonModule,
  NgOptimizedImage,
  RouterModule,
  IconComponent,
  CardComponent,
  CardHeaderComponent,
  CardBodyComponent,
  SpinnerComponent,
  AvatarComponent,
  UserComponent,
  TooltipDirective,
  SpinnerDirective,
  DatePipe,
  JsonPipe,
  KeyValuePipe,
  EnumValuePipe,
  NumberWithCommasPipe,
  PluralPipe,
  RangePipe,
  ThousandsSuffixPipe,
  TimeAgoPipe,
  TimingPipe,
  UnsortedKeyvaluePipe,
  TextareaAllowEnterDirective
];

/**
 * Shared imports used practically everywhere.
 */
@NgModule({
  imports: [...SHARED],
  exports: [...SHARED, FormsModule, ReactiveFormsModule]
})
export class SharedModule {}
