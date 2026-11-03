import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { ReportCategory, ReportType, Report } from '@momentum/constants';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { UpdateReportDialogComponent } from '../update-report-dialog/update-report-dialog.component';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AvatarComponent } from '../../../../components/avatar/avatar.component';
import { IconComponent } from '../../../../icons';
import { TooltipDirective } from '../../../../directives/tooltip.directive';

@Component({
  selector: 'm-queued-report',
  imports: [
    RouterLink,
    AvatarComponent,
    IconComponent,
    TooltipDirective,
    DatePipe
  ],
  templateUrl: './queued-report.component.html'
})
export class QueuedReportComponent implements AfterViewInit {
  private readonly dialogService = inject(DialogService);

  readonly report = input.required<Report>();
  readonly reportUpdate = output<Report>();

  readonly messageText = viewChild<ElementRef<HTMLElement>>('messageText');
  readonly resolutionMessageText = viewChild<ElementRef<HTMLElement>>(
    'resolutionMessageText'
  );

  protected readonly typeInfo = computed(() => {
    const report = this.report();
    switch (report.type) {
      case ReportType.USER_PROFILE_REPORT:
        return { text: 'User Profile Report', url: '/profile/' + report.data };
      case ReportType.MAP_REPORT:
        return { text: 'Map Report', url: '/maps/' + report.data };
      case ReportType.MAP_COMMENT_REPORT:
        return { text: 'Map Comment Report', url: '/' };
      case ReportType.PLAYER_REPORT:
        return { text: 'Player Report', url: '/profile/' + report.data };
      default:
        return { text: undefined, url: '' };
    }
  });

  protected readonly categoryText = computed(() => {
    switch (this.report().category) {
      case ReportCategory.INAPPROPRIATE_CONTENT:
        return 'Inappropriate Content';
      case ReportCategory.SPAM:
        return 'Spam';
      case ReportCategory.PLAGIARISM:
        return 'Plagiarism';
      case ReportCategory.OTHER:
        return 'Other';
      default:
        return '';
    }
  });

  protected readonly messageExpanded = signal(false);
  protected readonly resolutionMessageExpanded = signal(false);
  protected readonly messageOverflows = signal(false);
  protected readonly resolutionMessageOverflows = signal(false);

  ngAfterViewInit() {
    // Deferred a tick to avoid writing to these bindings during the same
    // change detection pass that rendered them (ExpressionChangedAfterChecked).
    // Measured while collapsed (line-clamp-2 applied), so scrollHeight
    // exceeding clientHeight means the text is actually being truncated.
    setTimeout(() => {
      this.messageOverflows.set(this.isOverflowing(this.messageText()));
      this.resolutionMessageOverflows.set(
        this.isOverflowing(this.resolutionMessageText())
      );
    });
  }

  private isOverflowing(ref: ElementRef<HTMLElement>): boolean {
    const el = ref?.nativeElement;
    return !!el && el.scrollHeight > el.clientHeight;
  }

  toggleMessage() {
    if (this.messageOverflows()) this.messageExpanded.update((v) => !v);
  }

  toggleResolutionMessage() {
    if (this.resolutionMessageOverflows()) {
      this.resolutionMessageExpanded.update((v) => !v);
    }
  }

  update() {
    this.dialogService
      .open(UpdateReportDialogComponent, {
        header: 'Update Report',
        data: { report: this.report() },
        style: { 'min-width': 'min(600px, 95vw)' }
      })
      .onClose.subscribe((report) => {
        if (report) this.reportUpdate.emit(report);
      });
  }
}
