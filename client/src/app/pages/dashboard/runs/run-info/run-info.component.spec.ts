import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RunInfoComponent } from './run-info.component';
import {ThemeModule} from '../../../../@theme/theme.module';

describe('RunInfoComponent', () => {
  let component: RunInfoComponent;
  let fixture: ComponentFixture<RunInfoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ThemeModule],
      declarations: [ RunInfoComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RunInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
