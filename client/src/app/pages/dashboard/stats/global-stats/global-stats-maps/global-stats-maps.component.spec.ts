import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {GlobalStatsMapsComponent} from './global-stats-maps.component';
import {NgxEchartsModule} from 'ngx-echarts';
import {NbCardModule} from '@nebular/theme';
import * as echarts from 'echarts';

describe('GlobalStatsMapsComponent', () => {
  let component: GlobalStatsMapsComponent;
  let fixture: ComponentFixture<GlobalStatsMapsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbCardModule, NgxEchartsModule.forRoot({ echarts })],
      declarations: [ GlobalStatsMapsComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GlobalStatsMapsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
