import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timing' })
export class TimingPipe implements PipeTransform {
  private static padNum(num: number): string {
    return num.toString().padStart(2, '0');
  }
  // Input is given as seconds
  transform(input: number): string {
    const hours = Math.trunc(input / 3600);
    const minutes = Math.trunc((input / 60) % 60);
    const seconds = Math.trunc(input % 60);
    const millis = input.toFixed(2).toString().split('.')[1];
    if (hours > 0) {
      return `${TimingPipe.padNum(hours)}:${TimingPipe.padNum(
        minutes
      )}:${TimingPipe.padNum(seconds)}`;
    } else if (minutes > 0) {
      return `${TimingPipe.padNum(minutes)}:${TimingPipe.padNum(
        seconds
      )}.${millis}`;
    } else {
      return `${seconds}.${millis}`;
    }
  }
}
