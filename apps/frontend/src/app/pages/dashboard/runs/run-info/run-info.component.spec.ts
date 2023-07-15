import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ThemeModule } from '@momentum/frontend/theme';
import { RouterTestingModule } from '@angular/router/testing';
import { ComponentsModule } from '../../../../components/components.module';
import { RunInfoComponent } from './run-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('RunInfoComponent', () => {
  let component: RunInfoComponent;
  let fixture: ComponentFixture<RunInfoComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ThemeModule,
        RouterTestingModule,
        HttpClientTestingModule,
        ComponentsModule
      ],
      declarations: [RunInfoComponent]
    });

    await TestBed.compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RunInfoComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
