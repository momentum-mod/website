import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { IconComponent } from '../../icons';
import { SafeUrl } from '@angular/platform-browser';

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
  imports: [IconComponent],
  templateUrl: './gallery.component.html'
})
export class GalleryComponent implements OnInit {
  @Input({ required: true }) items: GalleryItem[] = [];
  @Input() selectedItem: GalleryItem;
  @Output() selectedItemChange = new EventEmitter<GalleryItem>();

  @ViewChild('popover') popover: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    this.selectedItem ??= this.items[0];
  }

  show(): void {
    this.popover.nativeElement.showPopover();
  }

  selectItem(item: GalleryItem): void {
    this.selectedItem = item;
    this.selectedItemChange.emit(item);
  }
}
