import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThousandsSuffixPipe } from './thousands-suffix.pipe';
import { PluralPipe } from './plural.pipe';
import { TimingPipe } from './timing.pipe';
import { NumberWithCommasPipe } from './number-with-commas.pipe';
import { TimeAgoPipe } from './time-ago.pipe';
import { UnsortedKeyvaluePipe } from './unsorted-keyvalue.pipe';
import { EnumValuePipe } from './enum-value.pipe';

const PIPES = [
  NumberWithCommasPipe,
  PluralPipe,
  ThousandsSuffixPipe,
  TimingPipe,
  TimeAgoPipe,
  UnsortedKeyvaluePipe,
  EnumValuePipe
];

@NgModule({
  imports: [CommonModule],
  declarations: PIPES,
  exports: PIPES
})
export class PipesModule {}
