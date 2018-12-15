/*
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapListItemComponent } from './map-list-item.component';
import {NbOverlayModule, NbPopoverModule, NbThemeModule, NbUserModule} from '@nebular/theme';
import {RouterTestingModule} from '@angular/router/testing';
import {AuthService} from '../../../../../@core/data/auth.service';
import {CookieService} from 'ngx-cookie-service';
import {APP_BASE_HREF} from '@angular/common';
import {MomentumMapType} from '../../../../../@core/models/map-type.model';
import {MapUploadStatus} from '../../../../../@core/models/map-upload-status.model';
import {HttpClientModule} from '@angular/common/http';
import {ToasterService} from 'angular2-toaster';
import {ThemeModule} from '../../../../../@theme/theme.module';

describe('MapListItemComponent', () => {
  let component: MapListItemComponent;
  let fixture: ComponentFixture<MapListItemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        NbThemeModule,
        NbUserModule,
        RouterTestingModule,
        HttpClientModule,
        NbPopoverModule,
        NbOverlayModule.forRoot(),
      ],
      declarations: [ MapListItemComponent ],
      providers: [
        AuthService,
        CookieService,
        ToasterService,
        { provide: APP_BASE_HREF, useValue: '/' },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapListItemComponent);
    component = fixture.componentInstance;
    component.map = {
      id: 1,
      name: 'Test Map',
      type: MomentumMapType.BHOP,
      hash: '',
      statusFlag: MapUploadStatus.APPROVED,
      submitter: {
        id: '2',
        permissions: 2,
        country: 'US',
        profile: {
          id: '7',
          alias: 'dude',
          avatarURL: 'IJJJ',
        },
      },
      createdAt: new Date(),
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
*/
