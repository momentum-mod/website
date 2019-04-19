import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CommunityTwitchStreamComponent} from './community-twitch-stream.component';
import {NbCardModule} from '@nebular/theme';
import {TwitchAPIService} from '../../../../@core/data/twitch-api.service';
import {of} from 'rxjs';
import {TwitchStream} from '../../../../@core/models/twitch-stream.model';
import {NO_ERRORS_SCHEMA} from '@angular/core';

describe('CommunityTwitchStreamComponent', () => {
  let component: CommunityTwitchStreamComponent;
  let fixture: ComponentFixture<CommunityTwitchStreamComponent>;

  let twitchAPIStub: Partial<TwitchAPIService>;
  const twitchStream: TwitchStream = {
    title: 'This is a test stream!',
    user_name: 'Testy',
    viewer_count: 1000,
    started_at: new Date(),
    thumbnail_url: '',
  };

  beforeEach(async(() => {
    twitchAPIStub = {
      getGameStreams: () => {
        return of({
          data: [
            twitchStream,
          ],
        });
      },
    };
    TestBed.configureTestingModule({
      imports: [NbCardModule],
      declarations: [ CommunityTwitchStreamComponent ],
      providers: [
        { provide: TwitchAPIService, useValue: twitchAPIStub },
      ],
      schemas: [ NO_ERRORS_SCHEMA ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommunityTwitchStreamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
