import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  ViewChild,
  input,
  linkedSignal,
  signal
} from '@angular/core';
import { IconComponent } from '../../icons';
import { SafeUrl } from '@angular/platform-browser';
import { NgClass } from '@angular/common';

export interface GalleryImageItem {
  type: 'image';
  full: string;
  thumbnail: string;
}

export interface GalleryYouTubeItem {
  type: 'youtube';
  safeUrl: SafeUrl;
  safeThumbnail: SafeUrl;
}

export type GalleryItem = GalleryImageItem | GalleryYouTubeItem;

/**
 * Dead simple fullscreen gallery component using Popover API.
 */
@Component({
  selector: 'm-gallery',
  imports: [NgClass, IconComponent],
  templateUrl: './gallery.component.html'
})
export class GalleryComponent implements AfterViewInit {
  readonly items = input.required<GalleryItem[]>();
  readonly selectedItem = input<GalleryItem>();
  protected readonly currentItem = linkedSignal(
    () => this.selectedItem() ?? this.items()[0]
  );
  protected readonly selectedItemIndex = signal(0);
  @Output() selectedItemChange = new EventEmitter<GalleryItem>();

  @ViewChild('popover') popover: ElementRef<HTMLDivElement>;
  @ViewChild('youtubeIframe') youtubeIframe: ElementRef<HTMLIFrameElement>;

  @HostListener('window:keydown.ArrowLeft')
  @HostListener('window:keydown.a')
  cycleLeft() {
    if (!this.popover.nativeElement.matches(':popover-open')) return;

    if (this.selectedItemIndex() === 0) {
      this.selectItem(this.items().length - 1);
    } else {
      this.selectItem(this.selectedItemIndex() - 1);
    }
  }

  @HostListener('window:keydown.ArrowRight')
  @HostListener('window:keydown.d')
  cycleRight() {
    if (!this.popover.nativeElement.matches(':popover-open')) return;

    if (this.selectedItemIndex() === this.items().length - 1) {
      this.selectItem(0);
    } else {
      this.selectItem(this.selectedItemIndex() + 1);
    }
  }

  ngAfterViewInit(): void {
    this.popover.nativeElement.addEventListener('toggle', (ev: ToggleEvent) => {
      if (ev.newState !== 'open' && this.youtubeIframe) {
        this.youtubeIframe.nativeElement.contentWindow.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}',
          '*'
        );
      }
    });
  }

  show(): void {
    this.popover.nativeElement.showPopover();
  }

  selectItem(index: number): void {
    this.selectedItemIndex.set(index);
    this.currentItem.set(this.items()[index]);
    this.selectedItemChange.emit(this.currentItem());
  }
}
