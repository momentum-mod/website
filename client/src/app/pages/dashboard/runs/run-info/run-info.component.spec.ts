import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RunInfoComponent } from './run-info.component';

describe('RunInfoComponent', () => {
  let component: RunInfoComponent;
  let fixture: ComponentFixture<RunInfoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
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
