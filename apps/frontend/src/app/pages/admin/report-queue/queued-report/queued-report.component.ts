import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject
} from '@angular/core';
import { ReportCategory, ReportType, Report } from '@momentum/constants';
import { DialogService } from 'primeng/dynamicdialog';
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
export class QueuedReportComponent implements OnInit, AfterViewInit {
  private readonly dialogService = inject(DialogService);

  @Input() report: Report;
  @Output() reportUpdate = new EventEmitter<Report>();

  @ViewChild('messageText') messageText: ElementRef<HTMLElement>;
  @ViewChild('resolutionMessageText')
  resolutionMessageText: ElementRef<HTMLElement>;

  typeText: string;
  categoryText: string;
  reportedResourceURL = '';

  messageExpanded = false;
  resolutionMessageExpanded = false;
  messageOverflows = false;
  resolutionMessageOverflows = false;

  ngOnInit() {
    switch (this.report.type) {
      case ReportType.USER_PROFILE_REPORT:
        this.typeText = 'User Profile Report';
        this.reportedResourceURL = '/profile/' + this.report.data;
        break;
      case ReportType.MAP_REPORT:
        this.typeText = 'Map Report';
        this.reportedResourceURL = '/maps/' + this.report.data;
        break;
      case ReportType.MAP_COMMENT_REPORT:
        this.typeText = 'Map Comment Report';
        this.reportedResourceURL = '/';
        break;
      case ReportType.PLAYER_REPORT:
        this.typeText = 'Player Report';
        this.reportedResourceURL = '/profile/' + this.report.data;
        break;
    }
    switch (this.report.category) {
      case ReportCategory.INAPPROPRIATE_CONTENT:
        this.categoryText = 'Inappropriate Content';
        break;
      case ReportCategory.SPAM:
        this.categoryText = 'Spam';
        break;
      case ReportCategory.PLAGIARISM:
        this.categoryText = 'Plagiarism';
        break;
      case ReportCategory.OTHER:
        this.categoryText = 'Other';
        break;
    }
  }

  ngAfterViewInit() {
    // Deferred a tick to avoid writing to these bindings during the same
    // change detection pass that rendered them (ExpressionChangedAfterChecked).
    // Measured while collapsed (line-clamp-2 applied), so scrollHeight
    // exceeding clientHeight means the text is actually being truncated.
    setTimeout(() => {
      this.messageOverflows = this.isOverflowing(this.messageText);
      this.resolutionMessageOverflows = this.isOverflowing(
        this.resolutionMessageText
      );
    });
  }

  private isOverflowing(ref: ElementRef<HTMLElement>): boolean {
    const el = ref?.nativeElement;
    return !!el && el.scrollHeight > el.clientHeight;
  }

  toggleMessage() {
    if (this.messageOverflows) this.messageExpanded = !this.messageExpanded;
  }

  toggleResolutionMessage() {
    if (this.resolutionMessageOverflows) {
      this.resolutionMessageExpanded = !this.resolutionMessageExpanded;
    }
  }

  update() {
    this.dialogService
      .open(UpdateReportDialogComponent, {
        header: 'Update Report',
        data: { report: this.report },
        style: { 'min-width': '600px' }
      })
      .onClose.subscribe((report) => {
        if (report) this.reportUpdate.emit(report);
      });
  }
}
