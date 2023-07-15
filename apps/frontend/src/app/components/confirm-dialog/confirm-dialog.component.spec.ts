import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ThemeModule } from '@momentum/frontend/theme';
import { RouterTestingModule } from '@angular/router/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { DirectivesModule } from '@momentum/frontend/directives';
import { NbDialogRef } from '@nebular/theme';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ThemeModule.forRoot(),
        RouterTestingModule,
        DirectivesModule
      ],
      declarations: [ConfirmDialogComponent],
      providers: [{ provide: NbDialogRef, useValue: {} }]
    });

    await TestBed.compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
