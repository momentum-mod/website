import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapEditComponent } from './map-edit.component';
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
import {NbDialogService} from '@nebular/theme';
import {ToasterService} from 'angular2-toaster';

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

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, ThemeModule, HttpClientModule],
      declarations: [MapEditComponent],
      providers: [
        AuthService,
        CookieService,
        ToasterService,
        { provide: NbDialogService, useValue: {}},
        { provide: MapsService, useValue: mapServiceStub },
        { provide: APP_BASE_HREF, useValue: '/' },
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
