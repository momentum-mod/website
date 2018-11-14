import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CommunityTwitchStreamComponent} from './community-twitch-stream.component';
import {NbCardModule} from '@nebular/theme';
import {TwitchAPIService} from '../../../../@core/data/twitch-api.service';
import {of} from 'rxjs';
import {TwitchStream} from '../../../../@core/models/twitch-stream.model';
import {TwitchVideo} from '../../../../@core/models/twitch-video.model';

describe('CommunityTwitchStreamComponent', () => {
  let component: CommunityTwitchStreamComponent;
  let fixture: ComponentFixture<CommunityTwitchStreamComponent>;

  let twitchAPIStub: Partial<TwitchAPIService>;
  beforeEach(async(() => {
    const twitchStream: TwitchStream = {
      title: 'This is a test stream!',
    };
    const twitchVideo: TwitchVideo = {
      title: 'This is a sample video!',
    };
    twitchAPIStub = {
      getGameStreams: () => {
        return of({
          data: [
            twitchStream,
          ],
        });
      },
      getGameVideos: () => {
        return of({
          data: [
            twitchVideo,
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
