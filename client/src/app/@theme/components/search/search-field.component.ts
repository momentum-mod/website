import {
  AfterViewInit,
  Component, ElementRef,
  EventEmitter, HostBinding,
  Input,
  OnChanges,
  Output, SimpleChanges,
  ViewChild,
} from '@angular/core';
import {UsersService} from '../../../@core/data/users.service';
import {MapsService} from '../../../@core/data/maps.service';
import {User} from '../../../@core/models/user.model';
import {MomentumMap} from '../../../@core/models/momentum-map.model';

/**
 * search-field-component is used under the hood by nb-search component
 * can't be used itself
 */
@Component({
  selector: 'mom-search-field',
  styleUrls: [
    'styles/search.component.modal-zoomin.scss',
    'styles/search.component.layout-rotate.scss',
    'styles/search.component.modal-move.scss',
    'styles/search.component.curtain.scss',
    'styles/search.component.column-curtain.scss',
    'styles/search.component.modal-drop.scss',
    'styles/search.component.modal-half.scss',
  ],
  templateUrl: './search-field.component.html',
})
export class SearchFieldComponent implements OnChanges, AfterViewInit {

  static readonly TYPE_MODAL_ZOOMIN = 'modal-zoomin';
  static readonly TYPE_ROTATE_LAYOUT = 'rotate-layout';
  static readonly TYPE_MODAL_MOVE = 'modal-move';
  static readonly TYPE_CURTAIN = 'curtain';
  static readonly TYPE_COLUMN_CURTAIN = 'column-curtain';
  static readonly TYPE_MODAL_DROP = 'modal-drop';
  static readonly TYPE_MODAL_HALF = 'modal-half';

  users: User[] = null;
  maps: MomentumMap[] = null;
  onlyUsers: boolean = false;
  onlyMaps: boolean = false;

  @Input() type: string;
  @Input() placeholder: string;
  @Input() hint: string;
  @Input() show = false;

  @Output() close = new EventEmitter();
  @Output() search = new EventEmitter();

  @ViewChild('searchInput') inputElement: ElementRef<HTMLInputElement>;

  @HostBinding('class.show')
  get showClass() {
    return this.show;
  }

  @HostBinding('class.modal-zoomin')
  get modalZoomin() {
    return this.type === SearchFieldComponent.TYPE_MODAL_ZOOMIN;
  }

  @HostBinding('class.rotate-layout')
  get rotateLayout() {
    return this.type === SearchFieldComponent.TYPE_ROTATE_LAYOUT;
  }

  @HostBinding('class.modal-move')
  get modalMove() {
    return this.type === SearchFieldComponent.TYPE_MODAL_MOVE;
  }

  @HostBinding('class.curtain')
  get curtain() {
    return this.type === SearchFieldComponent.TYPE_CURTAIN;
  }

  @HostBinding('class.column-curtain')
  get columnCurtain() {
    return this.type === SearchFieldComponent.TYPE_COLUMN_CURTAIN;
  }

  @HostBinding('class.modal-drop')
  get modalDrop() {
    return this.type === SearchFieldComponent.TYPE_MODAL_DROP;
  }

  @HostBinding('class.modal-half')
  get modalHalf() {
    return this.type === SearchFieldComponent.TYPE_MODAL_HALF;
  }
  constructor(private usersService: UsersService,
              private mapsService: MapsService) {
  }

  ngOnChanges({ show }: SimpleChanges) {
    const becameHidden = !show.isFirstChange() && show.currentValue === false;
    if (becameHidden && this.inputElement) {
      this.inputElement.nativeElement.value = '';
    }

    this.focusInput();
  }

  ngAfterViewInit() {
    this.focusInput();
  }

  emitClose() {
    this.close.emit();
    this.users = null;
    this.maps = null;
  }

  submitSearch(term) {
    if (term) {
      this.search.emit(term);

      this.onlyUsers = term.startsWith('user:');
      this.onlyMaps = term.startsWith('map:');
      if (!this.onlyMaps)
        this.usersService.searchUsers(term.substring(this.onlyUsers ? 5 : 0).trim()).subscribe(resp => {
          this.users = resp.users;
        });
      if (!this.onlyUsers)
        this.mapsService.searchMaps(term.substring(this.onlyMaps ? 4 : 0).trim()).subscribe(maps => {
          this.maps = maps;
        });
    }
  }

  focusInput() {
    if (this.show && this.inputElement) {
      this.inputElement.nativeElement.focus();
    }
  }
}
