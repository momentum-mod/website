import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ThemeModule } from '@momentum/frontend/theme';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CreateReportDialogComponent } from './create-report-dialog.component';
import { NbDialogRef } from '@nebular/theme';

describe('CreateReportDialogComponent', () => {
  let component: CreateReportDialogComponent;
  let fixture: ComponentFixture<CreateReportDialogComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ThemeModule.forRoot(),
        RouterTestingModule,
        HttpClientTestingModule
      ],
      declarations: [CreateReportDialogComponent],
      providers: [{ provide: NbDialogRef, useValue: {} }]
    });

    await TestBed.compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateReportDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
