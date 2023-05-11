import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThousandsSuffixPipe } from './thousands-suffix.pipe';
import { PluralPipe } from './plural.pipe';
import { TimingPipe } from './timing.pipe';
import { NumberWithCommasPipe } from './number-with-commas.pipe';
import { TimeAgoPipe } from './time-ago.pipe';

const PIPES = [
  NumberWithCommasPipe,
  PluralPipe,
  ThousandsSuffixPipe,
  TimingPipe,
  TimeAgoPipe
];

@NgModule({
  imports: [CommonModule],
  exports: PIPES,
  declarations: PIPES
})
export class PipesModule {}
