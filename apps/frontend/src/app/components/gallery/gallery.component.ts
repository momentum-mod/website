import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  input,
  model,
  viewChild
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
  templateUrl: './gallery.component.html',
  host: {
    '(window:keydown.ArrowLeft)': 'cycleLeft()',
    '(window:keydown.a)': 'cycleLeft()',
    '(window:keydown.ArrowRight)': 'cycleRight()',
    '(window:keydown.d)': 'cycleRight()'
  }
})
export class GalleryComponent implements AfterViewInit {
  readonly items = input.required<GalleryItem[]>();
  /** Two-way bindable; defaults to the first item if never set. */
  readonly selectedItem = model<GalleryItem>();

  protected readonly currentItem = computed(
    () => this.selectedItem() ?? this.items()[0]
  );
  protected readonly selectedItemIndex = computed(() =>
    Math.max(this.items().indexOf(this.currentItem()), 0)
  );

  readonly popover = viewChild<ElementRef<HTMLDivElement>>('popover');
  readonly youtubeIframe =
    viewChild<ElementRef<HTMLIFrameElement>>('youtubeIframe');

  cycleLeft() {
    if (!this.popover().nativeElement.matches(':popover-open')) return;

    if (this.selectedItemIndex() === 0) {
      this.selectItem(this.items().length - 1);
    } else {
      this.selectItem(this.selectedItemIndex() - 1);
    }
  }

  cycleRight() {
    if (!this.popover().nativeElement.matches(':popover-open')) return;

    if (this.selectedItemIndex() === this.items().length - 1) {
      this.selectItem(0);
    } else {
      this.selectItem(this.selectedItemIndex() + 1);
    }
  }

  ngAfterViewInit(): void {
    this.popover().nativeElement.addEventListener(
      'toggle',
      (ev: ToggleEvent) => {
        const youtubeIframe = this.youtubeIframe();
        if (ev.newState !== 'open' && youtubeIframe) {
          youtubeIframe.nativeElement.contentWindow.postMessage(
            '{"event":"command","func":"pauseVideo","args":""}',
            '*'
          );
        }
      }
    );
  }

  show(): void {
    this.popover().nativeElement.showPopover();
  }

  selectItem(index: number): void {
    this.selectedItem.set(this.items()[index]);
  }
}
