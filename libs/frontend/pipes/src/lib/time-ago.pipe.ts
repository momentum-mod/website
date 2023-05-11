import {
  Pipe,
  PipeTransform,
  NgZone,
  ChangeDetectorRef,
  OnDestroy
} from '@angular/core';

// From https://github.com/AndrewPoyntz/time-ago-pipe
// Didn't want the extra dependency for something so basic
@Pipe({ name: 'timeAgo', pure: false })
export class TimeAgoPipe implements PipeTransform, OnDestroy {
  private timer: number | undefined;
  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  transform(value: string | Date) {
    this.removeTimer();

    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    const seconds = Math.round(
      Math.abs((now.getTime() - date.getTime()) / 1000)
    );

    if (Number.isNaN(seconds)) return '';

    this.timer = this.ngZone.runOutsideAngular(() =>
      window?.setTimeout(
        () => this.ngZone.run(() => this.changeDetectorRef.markForCheck()),
        Number.isNaN(seconds)
          ? 1000
          : this.getSecondsUntilUpdate(seconds) * 1000
      )
    );

    const minutes = Math.round(Math.abs(seconds / 60));
    const hours = Math.round(Math.abs(minutes / 60));
    const days = Math.round(Math.abs(hours / 24));
    const months = Math.round(Math.abs(days / 30.416));
    const years = Math.round(Math.abs(days / 365));
    if (seconds <= 45) return 'a few seconds ago';
    else if (seconds <= 90) return 'a minute ago';
    else if (minutes <= 45) return minutes + ' minutes ago';
    else if (minutes <= 90) return 'an hour ago';
    else if (hours <= 22) return hours + ' hours ago';
    else if (hours <= 36) return 'a day ago';
    else if (days <= 25) return days + ' days ago';
    else if (days <= 45) return 'a month ago';
    else if (days <= 345) return months + ' months ago';
    else if (days <= 545) return 'a year ago';
    else return years + ' years ago'; // (days > 545)
  }

  ngOnDestroy(): void {
    this.removeTimer();
  }

  private removeTimer() {
    if (!this.timer) return;

    window.clearTimeout(this.timer);
    this.timer = undefined;
  }

  private getSecondsUntilUpdate(seconds: number) {
    const min = 60;
    const hour = min * 60;
    const day = hour * 24;
    if (seconds < min)
      // less than 1 min, update every 2 secs
      return 2;
    else if (seconds < hour) {
      // less than an hour, update every 30 secs
      return 30;
    } else if (seconds < day) {
      // less then a day, update every 5 mins
      return 300;
    } else {
      // update every hour
      return 3600;
    }
  }
}
