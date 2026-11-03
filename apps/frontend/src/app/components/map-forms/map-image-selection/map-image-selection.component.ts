import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  viewChild,
  signal
} from '@angular/core';
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
import { MAX_MAP_IMAGES } from '@momentum/constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BackgroundState,
  LayoutService
} from '../../../services/layout.service';
import { TooltipDirective } from '../../../directives/tooltip.directive';

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
  imports: [
    MultiFileUploadComponent,
    FormsModule,
    ReactiveFormsModule,
    IconComponent,
    TooltipDirective,
    CdkDropList,
    CdkDrag
  ]
})
export class MapImageSelectionComponent implements OnInit {
  private readonly layoutService = inject(LayoutService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formControlPassthrough = input.required<FormControl<File[]>>();
  readonly icon = input<Icon>();
  readonly disabled = input(false);
  readonly previewFullscreenBackground = input(false);

  private readonly uploadComponent = viewChild(MultiFileUploadComponent);

  protected readonly ImageSelectionType = ImageSelectionType;
  protected readonly max = 5;

  ngOnInit() {
    this.formControlPassthrough()
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onFileSelectionChanged());
  }

  // The arrays inside are mutated in place (CDK drag-drop requires it), often
  // after awaiting file reads, so every mutation is followed by publish() to
  // give the view a new reference.
  public readonly items = signal<
    Record<ImageSelectionType, Array<ImageSelectionItem>>
  >({
    [ImageSelectionType.THUMBNAIL]: [],
    [ImageSelectionType.EXTRA]: []
  });

  private publish() {
    this.items.update((items) => ({ ...items }));
  }

  public setItems(
    thumbnail: ImageSelectionItem[],
    extras: ImageSelectionItem[]
  ) {
    this.items.set({
      [ImageSelectionType.THUMBNAIL]: thumbnail,
      [ImageSelectionType.EXTRA]: extras
    });
  }

  async onFileSelectionChanged() {
    const items = this.items();
    if (Object.values(items).flat().length > MAX_MAP_IMAGES) {
      this.formControlPassthrough().disable({ emitEvent: false });
      this.uploadComponent().disabledBecauseReachedMax.set(true);
    }

    const formControlPassthrough = this.formControlPassthrough();
    if (!(formControlPassthrough.value?.length > 0)) return;

    const newFiles = structuredClone(formControlPassthrough.value) as File[];

    if (items[ImageSelectionType.THUMBNAIL].length === 0) {
      let file: File;
      while ((file = newFiles.shift())) {
        const item = await ImageSelectionItem.create(file);
        if (!item) continue;

        items[ImageSelectionType.THUMBNAIL].push(item);
        break;
      }

      // Extras must be empty so just reassign
      items[ImageSelectionType.EXTRA] = await Promise.all(
        newFiles.map((file) => ImageSelectionItem.create(file)).filter(Boolean)
      );

      this.publish();
      this.onThumbnailChanged();
    } else {
      items[ImageSelectionType.EXTRA] = [
        ...items[ImageSelectionType.EXTRA],
        ...(await Promise.all(
          newFiles
            .filter(
              (newFile) =>
                ![
                  ...items[ImageSelectionType.THUMBNAIL],
                  ...items[ImageSelectionType.EXTRA]
                ].some(
                  (item) =>
                    item?.file &&
                    AbstractFileUploadComponent.isIdenticalFile(
                      item.file,
                      newFile
                    )
                )
            )
            .map((file) => ImageSelectionItem.create(file))
            .filter(Boolean)
        ))
      ];
      this.publish();
    }
  }

  onThumbnailChanged() {
    // This image could actually be invalid according to outer form, but
    // going to still update the image anyway. Refactoring this to expose the
    // ImageSelectionItems in outer form (so we can access dataUrls) would be
    // a huge pain.
    if (!this.previewFullscreenBackground()) return;

    const thumbnail = this.items()[ImageSelectionType.THUMBNAIL];
    if (thumbnail.length === 0) {
      this.layoutService.setBackgroundState(BackgroundState.DISABLED);
      return;
    }

    this.layoutService.setBackgroundState(BackgroundState.ENABLED);
    this.layoutService.setBackgroundImage(thumbnail[0].dataUrl);
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
      const targetData = this.items()[newType];
      const previousData = this.items()[originalType];

      if (newType === ImageSelectionType.EXTRA) {
        // Thumbnail -> Extra:
        // Don't allow if we don't have any extras
        if (this.items()[ImageSelectionType.EXTRA].length === 0) return;
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

    this.publish();
    this.updateFormValue();
  }

  removeItem(item: ImageSelectionItem, type: ImageSelectionType) {
    const items = this.items();
    const arr = items[type];
    arr.splice(
      arr.findIndex(({ dataUrl, file }) =>
        file
          ? AbstractFileUploadComponent.isIdenticalFile(file, item.file)
          : dataUrl === item.dataUrl
      ),
      1
    );

    if (type === ImageSelectionType.THUMBNAIL) {
      if (items[ImageSelectionType.EXTRA].length > 0) {
        transferArrayItem(
          items[ImageSelectionType.EXTRA],
          items[ImageSelectionType.THUMBNAIL],
          0,
          0
        );
      }

      this.onThumbnailChanged();
    }

    this.publish();
    this.updateFormValue();
  }

  updateFormValue() {
    // If editing existing images and move order, should be marked considered
    // touched + dirty
    this.formControlPassthrough().markAsTouched();
    this.formControlPassthrough().markAsDirty();

    this.formControlPassthrough().setValue(
      [
        ...this.items()[ImageSelectionType.THUMBNAIL],
        ...this.items()[ImageSelectionType.EXTRA]
      ]
        .filter(({ file }) => file)
        .map(({ file }) => file)
    );
  }
}
