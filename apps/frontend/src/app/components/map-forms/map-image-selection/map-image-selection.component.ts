import { Component, Input, OnInit } from '@angular/core';
import {
  ControlContainer,
  FormControl,
  FormGroup,
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

enum ImageType {
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
  private control: FormControl;
  form: FormGroup;

  @Input({ required: true }) innerFormControlName!: string;
  @Input() icon: Icon;
  @Input() disabled = false;
  @Input() previewFullscreenBackground = false;

  protected readonly ImageType = ImageType;
  protected readonly max = 5;

  constructor(
    private readonly controlContainer: ControlContainer,
    private readonly layoutService: LayoutService
  ) {}

  ngOnInit() {
    this.form = <FormGroup>this.controlContainer.control;
    this.control = this.form.get(this.innerFormControlName) as FormControl;
    this.control.valueChanges.subscribe(() => this.onFileSelectionChanged());
  }

  protected items: Record<ImageType, Array<ImageSelectionItem>> = {
    [ImageType.THUMBNAIL]: [],
    [ImageType.EXTRA]: []
  };

  async onFileSelectionChanged() {
    const newFiles = structuredClone(this.control.value) as File[];

    if (this.items[ImageType.THUMBNAIL].length === 0) {
      let file: File;
      while ((file = newFiles.shift())) {
        const item = await ImageSelectionItem.create(file);
        if (!item) continue;

        this.items[ImageType.THUMBNAIL].push(item);
        break;
      }

      // Extras must be empty so just reassign
      this.items[ImageType.EXTRA] = await Promise.all(
        newFiles.map((file) => ImageSelectionItem.create(file)).filter(Boolean)
      );

      this.onThumbnailChanged();
    } else {
      this.items[ImageType.EXTRA] = [
        ...this.items[ImageType.EXTRA],
        ...(await Promise.all(
          newFiles
            .filter(
              (newFile) =>
                ![
                  ...this.items[ImageType.THUMBNAIL],
                  ...this.items[ImageType.EXTRA]
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

    if (this.items[ImageType.THUMBNAIL].length === 0) {
      this.layoutService.setBackgroundState(BackgroundState.DISABLED);
      return;
    }

    this.layoutService.setBackgroundState(BackgroundState.ENABLED);
    this.layoutService.setBackgroundImage(
      this.items[ImageType.THUMBNAIL][0].dataUrl
    );
  }

  drop(event: CdkDragDrop<ImageSelectionItem[]>, newType: ImageType) {
    if (event.previousContainer === event.container) {
      // Thumbnail -> Thumbnail: no point shifting
      if (newType === ImageType.THUMBNAIL) return;

      // Extra -> Extra: moves around normally, standard drag'n'drop stuff
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      // Containers weren't equal so nor are types
      const originalType =
        newType === ImageType.EXTRA ? ImageType.THUMBNAIL : ImageType.EXTRA;
      const targetData = this.items[newType];
      const previousData = this.items[originalType];

      if (newType === ImageType.EXTRA) {
        // Thumbnail -> Extra:
        // Don't allow if we don't have any extras
        if (this.items[ImageType.EXTRA].length === 0) return;
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

  removeItem(file: File, type: ImageType) {
    const arr = this.items[type];
    arr.splice(
      arr.findIndex((x) =>
        AbstractFileUploadComponent.isIdenticalFile(x.file, file)
      ),
      1
    );

    if (type === ImageType.THUMBNAIL) {
      if (this.items[ImageType.EXTRA].length > 0) {
        transferArrayItem(
          this.items[ImageType.EXTRA],
          this.items[ImageType.THUMBNAIL],
          0,
          0
        );
      }

      this.onThumbnailChanged();
    }

    this.updateFormValue();
  }

  updateFormValue() {
    this.control.setValue(
      [...this.items[ImageType.THUMBNAIL], ...this.items[ImageType.EXTRA]].map(
        ({ file }) => file
      )
    );
  }
}
