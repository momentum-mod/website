import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteUserDialogComponent } from './delete-user-dialog.component';
import { NbDialogRef, NbDialogService } from '@nebular/theme';
import { SharedModule } from '../../shared.module';

describe('ConfirmDialogComponent', () => {
  let component: DeleteUserDialogComponent;
  let fixture: ComponentFixture<DeleteUserDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [SharedModule],
      declarations: [DeleteUserDialogComponent],
      providers: [NbDialogService, { provide: NbDialogRef, useValue: {} }]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeleteUserDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
