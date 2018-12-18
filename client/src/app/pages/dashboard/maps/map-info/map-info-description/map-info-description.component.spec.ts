import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MapInfoDescriptionComponent} from './map-info-description.component';
import {MarkdownModule} from 'ngx-markdown';
import {NbUserModule} from '@nebular/theme';
import {MomentumMapType} from '../../../../../@core/models/map-type.model';

describe('MapInfoDescriptionComponent', () => {
  let component: MapInfoDescriptionComponent;
  let fixture: ComponentFixture<MapInfoDescriptionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [MarkdownModule.forRoot(), NbUserModule],
      declarations: [ MapInfoDescriptionComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapInfoDescriptionComponent);
    component = fixture.componentInstance;
    component.map = {
      id: 1,
      name: 'test',
      type: MomentumMapType.SURF,
      hash: 'no thanks',
      statusFlag: 0,
      info: {
        id: '1',
        avatarURL: '',
        description: 'Test',
        numBonuses: 2,
        numZones: 3,
        isLinear: false,
        difficulty: 0,
        creationDate: new Date(),
      },
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
