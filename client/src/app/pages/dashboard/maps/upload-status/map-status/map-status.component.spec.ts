import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapStatusComponent } from './map-status.component';
import {MomentumMapType} from '../../../../../@core/models/map-type.model';

describe('MapStatusComponent', () => {
  let component: MapStatusComponent;
  let fixture: ComponentFixture<MapStatusComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MapStatusComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapStatusComponent);
    component = fixture.componentInstance;
    component.map = {
      id: 123,
      name: 'testmap1',
      type: MomentumMapType.UNKNOWN,
      hash: '',
      statusFlag: 0,
      submitterID: '1337',
      info: {
        id: '1234',
        description: 'This is a testmap1',
        numTracks: 1,
        creationDate: new Date(),
      },
      tracks: [{
        trackNum: 0,
        mapID: 123,
        numZones: 1,
        isLinear: false,
        difficulty: 5,
      }],
      credits: [
        {
          id: '1234',
          type: 0,
          user: {
            id: '1234',
            alias: 'Mapperooni',
            avatarURL: '',
            country: 'US',
            roles: 0,
            bans: 0,
            profile: {
              id: '244',
              bio: 'Testy',
            },
          },
        },
      ],
      /*          leaderboardID?: string;
				download?: string;*/
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
