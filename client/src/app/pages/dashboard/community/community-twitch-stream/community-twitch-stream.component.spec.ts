import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CommunityTwitchStreamComponent} from './community-twitch-stream.component';
import {DataModule} from '../../../../@core/data/data.module';
import {HttpClientModule} from '@angular/common/http';

describe('CommunityTwitchStreamComponent', () => {
  let component: CommunityTwitchStreamComponent;
  let fixture: ComponentFixture<CommunityTwitchStreamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [DataModule.forRoot(), HttpClientModule],
      declarations: [ CommunityTwitchStreamComponent ],
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
