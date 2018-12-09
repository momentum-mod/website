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
        avatarURL: '',
        description: 'This is a testmap1',
        numBonuses: 0,
        numZones: 3,
        isLinear: false,
        difficulty: 4,
        creationDate: new Date(),
      },
      credits: [
        {
          id: '1234',
          type: 0,
          user: {
            id: '1234',
            country: 'US',
            permissions: 0,
            profile: {
              id: '244',
              alias: 'Mapperooni',
              avatarURL: '',
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
