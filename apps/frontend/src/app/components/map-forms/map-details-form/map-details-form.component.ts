import {
  Component,
  DestroyRef,
  Input,
  OnInit,
  QueryList,
  ViewChildren,
  inject
} from '@angular/core';
import {
  MapSubmissionType,
  MAX_MAP_DESCRIPTION_LENGTH,
  MAX_MAP_NAME_LENGTH,
  MIN_MAP_DESCRIPTION_LENGTH,
  MIN_MAP_NAME_LENGTH,
  SteamGame,
  SteamGamesNames,
  SteamGamesImages
} from '@momentum/constants';
import {
  FormControl,
  FormControlStatus,
  FormGroup,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { SubmissionTypeInfoComponent } from '../../tooltips/submission-type-info.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as Enum from '@momentum/enum';

import { TooltipDirective } from '../../../directives/tooltip.directive';
import { DatePicker } from 'primeng/datepicker';
import { IconComponent } from '../../../icons';
import { Select } from 'primeng/select';
import { PluralPipe } from '../../../pipes/plural.pipe';
import { ChipsComponent } from '../../chips/chips.component';

@Component({
  selector: 'm-map-details-form',
  templateUrl: 'map-details-form.component.html',
  imports: [
    DatePickerModule,
    SelectModule,
    SubmissionTypeInfoComponent,
    IconComponent,
    FormsModule,
    DatePicker,
    ReactiveFormsModule,
    TooltipDirective,
    Select,
    PluralPipe,
    ChipsComponent
  ]
})
export class MapDetailsFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly MapSubmissionType = MapSubmissionType;
  protected readonly SteamGames = Enum.values(SteamGame);
  protected readonly MIN_MAP_DESCRIPTION_LENGTH = MIN_MAP_DESCRIPTION_LENGTH;
  protected readonly MAX_MAP_DESCRIPTION_LENGTH = MAX_MAP_DESCRIPTION_LENGTH;
  protected readonly maxDate = new Date();
  protected mapSubmissionTypeOptions: Array<{
    type: MapSubmissionType;
    label: string;
  }>;

  @Input({ required: true }) formGroup: FormGroup<{
    name: FormControl<string>;
    description: FormControl<string>;
    portingChangelog: FormControl<string>;
    creationDate: FormControl<Date>;
    submissionType: FormControl<MapSubmissionType>;
    youtubeID: FormControl<string>;
    requiredGames: FormControl<SteamGame[]>;
  }>;

  private _isModOrAdmin: boolean;
  get isModOrAdmin() {
    return this._isModOrAdmin;
  }
  @Input({ required: true }) set isModOrAdmin(val: boolean) {
    this._isModOrAdmin = val;

    this.mapSubmissionTypeOptions = [
      { type: MapSubmissionType.ORIGINAL, label: 'Original' },
      { type: MapSubmissionType.PORT, label: 'Port' }
    ];
    if (val)
      this.mapSubmissionTypeOptions.push({
        type: MapSubmissionType.SPECIAL,
        label: 'Special (Moderator only)'
      });
  }

  @ViewChildren(TooltipDirective)
  tooltips: QueryList<TooltipDirective>;

  ngOnInit() {
    this.name.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(this.onNameStatusChange.bind(this));

    this.creationDate.valueChanges.subscribe((val: Date) => {
      const utc = new Date(
        Date.UTC(
          val.getFullYear(),
          val.getMonth(),
          val.getDate(),
          val.getHours(),
          val.getMinutes(),
          val.getSeconds(),
          val.getMilliseconds()
        )
      );
      this.creationDate.setValue(utc, { emitEvent: false });
    });
  }

  onNameStatusChange(status: FormControlStatus) {
    const tooltip = TooltipDirective.findByContext(
      this.tooltips,
      'mapNameError'
    );
    if (status !== 'INVALID') {
      tooltip.hide();
      return;
    }

    const errors = this.name.errors;
    if (Object.values(errors).length > 0) {
      let str = JSON.stringify(Object.values(errors)[0]);
      if (errors['uniqueMapName']) {
        str = 'Map name is in use!';
      } else if (errors['maxlength'] || errors['minlength']) {
        str = `Map name must be between ${MIN_MAP_NAME_LENGTH} and ${MAX_MAP_NAME_LENGTH} characters.`;
      } else if (errors['pattern']) {
        str =
          'Name must consist of lowercase letters, _ and -, and cannot start with a number.';
      }
      tooltip.setAndShow(str);
    } else {
      tooltip.hide();
    }
  }

  /**
   * Remove any extra crap from Youtube ID field if a full URL is pasted in,
   * e.g. https://youtu.be/JhPPHchfhQY?t=5 becomes JhPPHchfhQY
   */
  stripYoutubeUrl() {
    const url = this.youtubeID.value;
    if (/.*youtube\.com\/watch\?v=[\w-]{11}.*/.test(url)) {
      this.youtubeID.setValue(/(?<=v=)[\w-]{11}/.exec(url)[0]);
    } else if (/youtu\.be\/[\w-]{11}.*/.test(url)) {
      this.youtubeID.setValue(/(?<=youtu\.be\/)[\w-]{11}/.exec(url)[0]);
    }
  }

  steamGameName = (game: SteamGame) => SteamGamesNames.get(game);
  steamGameImage = (game: SteamGame) => SteamGamesImages.get(game);

  get youtubeID() {
    return this.formGroup.get('youtubeID') as FormControl<string>;
  }

  get name() {
    return this.formGroup.get('name') as FormControl<string>;
  }

  get description() {
    return this.formGroup.get('description') as FormControl<string>;
  }

  get portingChangelog() {
    return this.formGroup.get('portingChangelog') as FormControl<string>;
  }

  get creationDate() {
    return this.formGroup.get('creationDate') as FormControl<Date>;
  }

  get submissionType() {
    return this.formGroup.get(
      'submissionType'
    ) as FormControl<MapSubmissionType>;
  }

  get requiredGames() {
    return this.formGroup.get('requiredGames') as FormControl<SteamGame[]>;
  }
}
