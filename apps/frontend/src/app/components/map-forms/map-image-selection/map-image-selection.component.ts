import { Component, Input, OnInit } from '@angular/core';
import {
  ControlContainer,
  FormControl,
  FormGroupDirective,
  FormsModule,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { Icon, IconComponent } from '../../../icons';
import { AbstractFileUploadComponent } from '../../file-upload/abstract-file-upload.component';
import { MultiFileUploadComponent } from '../../file-upload/multi-file-upload.component';
import { ImageSelectionItem } from './image-selection-item.class';
import { BackgroundState, LayoutService } from '../../../services';

export enum ImageSelectionType {
  THUMBNAIL,
  EXTRA
}

@Component({
  selector: 'm-map-image-selection',
  templateUrl: 'map-image-selection.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: MapImageSelectionComponent,
      multi: true
    }
  ],
  viewProviders: [
    { provide: ControlContainer, useExisting: FormGroupDirective }
  ],
  standalone: true,
  imports: [
    MultiFileUploadComponent,
    FormsModule,
    ReactiveFormsModule,
    IconComponent,
    CdkDropList,
    CdkDrag
  ]
})
export class MapImageSelectionComponent implements OnInit {
  @Input({ required: true }) formControlPassthrough: FormControl;
  @Input() icon: Icon;
  @Input() disabled = false;
  @Input() previewFullscreenBackground = false;

  protected readonly ImageSelectionType = ImageSelectionType;
  protected readonly max = 5;

  constructor(private readonly layoutService: LayoutService) {}

  ngOnInit() {
    this.formControlPassthrough.valueChanges.subscribe(() =>
      this.onFileSelectionChanged()
    );
  }

  public items: Record<ImageSelectionType, Array<ImageSelectionItem>> = {
    [ImageSelectionType.THUMBNAIL]: [],
    [ImageSelectionType.EXTRA]: []
  };

  async onFileSelectionChanged() {
    const newFiles = structuredClone(
      this.formControlPassthrough.value
    ) as File[];

    if (this.items[ImageSelectionType.THUMBNAIL].length === 0) {
      let file: File;
      while ((file = newFiles.shift())) {
        const item = await ImageSelectionItem.create(file);
        if (!item) continue;

        this.items[ImageSelectionType.THUMBNAIL].push(item);
        break;
      }

      // Extras must be empty so just reassign
      this.items[ImageSelectionType.EXTRA] = await Promise.all(
        newFiles.map((file) => ImageSelectionItem.create(file)).filter(Boolean)
      );

      this.onThumbnailChanged();
    } else {
      this.items[ImageSelectionType.EXTRA] = [
        ...this.items[ImageSelectionType.EXTRA],
        ...(await Promise.all(
          newFiles
            .filter(
              (newFile) =>
                ![
                  ...this.items[ImageSelectionType.THUMBNAIL],
                  ...this.items[ImageSelectionType.EXTRA]
                ].some(({ file }) =>
                  AbstractFileUploadComponent.isIdenticalFile(file, newFile)
                )
            )
            .map((file) => ImageSelectionItem.create(file))
            .filter(Boolean)
        ))
      ];
    }
  }

  onThumbnailChanged() {
    // This image could actually be invalid according to outer form, but
    // going to still update the image anyway. Refactoring this to expose the
    // ImageSelectionItems in outer form (so we can access dataUrls) would be
    // a huge pain.
    if (!this.previewFullscreenBackground) return;

    if (this.items[ImageSelectionType.THUMBNAIL].length === 0) {
      this.layoutService.setBackgroundState(BackgroundState.DISABLED);
      return;
    }

    this.layoutService.setBackgroundState(BackgroundState.ENABLED);
    this.layoutService.setBackgroundImage(
      this.items[ImageSelectionType.THUMBNAIL][0].dataUrl
    );
  }

  drop(event: CdkDragDrop<ImageSelectionItem[]>, newType: ImageSelectionType) {
    if (event.previousContainer === event.container) {
      // Thumbnail -> Thumbnail: no point shifting
      if (newType === ImageSelectionType.THUMBNAIL) return;

      // Extra -> Extra: moves around normally, standard drag'n'drop stuff
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      // Containers weren't equal so nor are types
      const originalType =
        newType === ImageSelectionType.EXTRA
          ? ImageSelectionType.THUMBNAIL
          : ImageSelectionType.EXTRA;
      const targetData = this.items[newType];
      const previousData = this.items[originalType];

      if (newType === ImageSelectionType.EXTRA) {
        // Thumbnail -> Extra:
        // Don't allow if we don't have any extras
        if (this.items[ImageSelectionType.EXTRA].length === 0) return;
        // Otherwise pick the first extra and make it the thumbnail, then
        // move original thumbnail to extras

        transferArrayItem(targetData, previousData, 0, 0);
        transferArrayItem(previousData, targetData, 1, event.currentIndex - 1);
      } else {
        // Extra -> Thumbnail: just swap em
        transferArrayItem(previousData, targetData, event.previousIndex, 0);
        transferArrayItem(targetData, previousData, 1, event.previousIndex);
      }

      this.onThumbnailChanged();
    }

    this.updateFormValue();
  }

  removeItem(item: ImageSelectionItem, type: ImageSelectionType) {
    if (item.file) {
      const arr = this.items[type];
      arr.splice(
        arr.findIndex((x) =>
          AbstractFileUploadComponent.isIdenticalFile(x.file, item.file)
        ),
        1
      );
    }

    if (type === ImageSelectionType.THUMBNAIL) {
      if (this.items[ImageSelectionType.EXTRA].length > 0) {
        transferArrayItem(
          this.items[ImageSelectionType.EXTRA],
          this.items[ImageSelectionType.THUMBNAIL],
          0,
          0
        );
      }

      this.onThumbnailChanged();
    }

    this.updateFormValue();
  }

  updateFormValue() {
    this.formControlPassthrough.setValue(
      [
        ...this.items[ImageSelectionType.THUMBNAIL],
        ...this.items[ImageSelectionType.EXTRA]
      ]
        .filter(({ file }) => file)
        .map(({ file }) => file)
    );
  }
}
