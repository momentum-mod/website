import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeUserLibraryComponent } from './home-user-library.component';
import { LocalUserService } from '@momentum/frontend/data';
import { of } from 'rxjs';
import { SharedModule } from '../../../../shared.module';

describe('HomeUserLibraryComponent', () => {
  let component: HomeUserLibraryComponent;
  let fixture: ComponentFixture<HomeUserLibraryComponent>;
  let userService: LocalUserService;

  // Before each test, we set up the test bed
  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SharedModule],
      declarations: [HomeUserLibraryComponent],
      providers: [
        {
          provide: LocalUserService,
          useValue: {
            getMapLibrary: jest.fn()
          }
        }
      ]
    });

    await TestBed.compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeUserLibraryComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(LocalUserService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getMapLibrary on init', () => {
    jest
      .spyOn(userService, 'getMapLibrary')
      .mockReturnValue(of({ totalCount: 0, returnCount: 0, data: [] }));
    component.ngOnInit();
    expect(userService.getMapLibrary).toHaveBeenCalled();
  });

  it('should update mapLibraryCount and mostRecentlyAddedMap on init', () => {
    const res = [{ map: { whatever: 1 } }] as any;
    jest
      .spyOn(userService, 'getMapLibrary')
      .mockReturnValue(of({ totalCount: 1, returnCount: 0, data: res }));
    component.ngOnInit();
    expect(component.mapLibraryCount).toBe(1);
    expect(component.mostRecentlyAddedMap).toEqual({ whatever: 1 });
  });
});
