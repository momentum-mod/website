import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapStatusComponent } from './map-status.component';

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
      id: '123',
      name: 'testmap1',
      hash: '',
      statusFlag: 0,
      submitterID: '1337',
      createdAt: new Date(),
      info: {
        id: '1234',
        totalDownloads: '123',
        avatarURL: '',
        description: 'This is a testmap1',
        numBonuses: 0,
        numCheckpoints: 2,
        numStages: 3,
        difficulty: 4,
      },
      credits: [
        {
          id: '1234',
          type: 0,
          user: {
            id: '1234',
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
