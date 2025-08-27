import { Pipe, PipeTransform } from '@angular/core';

function padNum(num: number): string {
  return num.toString().padStart(2, '0');
}

@Pipe({ name: 'timing', standalone: true })
export class TimingPipe implements PipeTransform {
  // Input is given as seconds
  transform(input: number): string {
    // Logic here follows MomUtil::FormatTime in C++.
    // It always rounds hundredths down, so does *not* match Number.toFixed().
    // E.g., 18.999 -> 18.99, not 19.00.
    const hours = Math.trunc(input / 3600);
    const minutes = Math.trunc((input / 60) % 60);
    const seconds = Math.trunc(input % 60);
    const millis = Math.trunc((input % 1) * 1000);
    const hundredths = Math.trunc(millis / 10);

    if (hours > 0) {
      return `${padNum(hours)}:${padNum(minutes)}:${padNum(seconds)}`;
    } else if (minutes > 0) {
      return `${padNum(minutes)}:${padNum(seconds)}.${padNum(hundredths)}`;
    } else {
      return `${seconds}.${padNum(hundredths)}`;
    }
  }
}
