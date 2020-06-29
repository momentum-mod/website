import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MapEditComponent} from './map-edit.component';
import {FileUploadComponent} from '../upload-form/file-upload/file-upload.component';
import {MapCreditsComponent} from '../map-credits/map-credits.component';
import {MapCreditComponent} from '../map-credits/map-credit/map-credit.component';
import {UserSearchComponent} from '../../user/user-search/user-search.component';
import {RouterTestingModule} from '@angular/router/testing';
import {ThemeModule} from '../../../../@theme/theme.module';
import {APP_BASE_HREF} from '@angular/common';
import {MapsService} from '../../../../@core/data/maps.service';
import {of} from 'rxjs';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {MomentumMapType} from '../../../../@core/models/map-type.model';
import {MapUploadStatus} from '../../../../@core/models/map-upload-status.model';
import {AuthService} from '../../../../@core/data/auth.service';
import {CookieService} from 'ngx-cookie-service';
import {HttpClientModule} from '@angular/common/http';
import {
  NbAlertModule,
  NbDialogService,
  NbFocusMonitor,
  NbToastrConfig,
  NbToastRef,
  NbToastrService,
} from '@nebular/theme';
import {FocusMonitor} from '@angular/cdk/a11y';

describe('MapEditComponent', () => {

  let component: MapEditComponent;
  let fixture: ComponentFixture<MapEditComponent>;
  let mapServiceStub: Partial<MapsService>;

  const testMap: MomentumMap = {
    id: 1,
    name: 'Test Map',
    type: MomentumMapType.BHOP,
    hash: '',
    statusFlag: MapUploadStatus.APPROVED,
    submitter: {
      id: 2,
      steamID: '2',
      alias: 'dude',
      aliasLocked: false,
      avatarURL: 'IJJJ',
      roles: 0,
      bans: 0,
      country: 'US',
      profile: {
        id: '7',
        bio: 'Just another paper cut survivor.',
      },
    },
    createdAt: new Date().toString(),
  };

  mapServiceStub = {
    getMap: () => {
      return of(testMap);
    },
  };

  let toastrStub: Partial<NbToastrService>;
  beforeEach(async(() => {
    toastrStub = {
      danger(message: any, title?: any, config?: Partial<NbToastrConfig>): NbToastRef {
        return null;
      },
      success(message: any, title?: any, config?: Partial<NbToastrConfig>): NbToastRef {
        return null;
      },
    };
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, ThemeModule, NbAlertModule, HttpClientModule],
      declarations: [
        MapEditComponent, FileUploadComponent, MapCreditsComponent, MapCreditComponent, UserSearchComponent,
      ],
      providers: [
        AuthService,
        CookieService,
        { provide: NbDialogService, useValue: {}},
        { provide: MapsService, useValue: mapServiceStub },
        { provide: APP_BASE_HREF, useValue: '/' },
        { provide: NbToastrService, useValue: toastrStub },
        { provide: NbFocusMonitor, useClass: FocusMonitor },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
