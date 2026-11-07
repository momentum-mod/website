import { Directive, inject, OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  tap
} from 'rxjs/operators';
import { merge, Observable, Observer, Subject } from 'rxjs';
import { PaginatorState } from '@openng/optimus-ui/paginator';
import { PagedResponse } from '@momentum/constants';

@Directive()
export abstract class AbstractSearchComponent<T> implements OnInit {
  private readonly nnfb = inject(NonNullableFormBuilder);

  public readonly selected = output<T>();

  public readonly search = this.nnfb.control<string>('');
  protected readonly searchStatus = toSignal(this.search.statusChanges, {
    initialValue: this.search.status
  });
  protected readonly searchValue = toSignal(this.search.valueChanges, {
    initialValue: this.search.value
  });
  protected readonly pageChange = new Subject<PaginatorState>();

  abstract readonly itemsName: string;
  protected readonly found = signal<T[]>([]);
  protected readonly rows = 5;
  protected readonly totalRecords = signal(0);
  protected readonly first = signal(0);

  protected error: string;

  ngOnInit() {
    merge(
      this.pageChange.pipe(tap(({ first }) => this.first.set(first))),
      this.search.valueChanges.pipe(
        distinctUntilChanged(),
        filter((value) => {
          if (value?.trim().length > 0) return true;
          this.resetSearchData();
          return false;
        }),
        debounceTime(200)
      )
    )
      .pipe(
        switchMap(() => {
          const value = this.search.value;
          this.search.markAsPending();
          return this.searchRequest(value);
        })
      )
      .subscribe(this.onResponse);
  }

  onResponse: Partial<Observer<T | PagedResponse<T>>> = {
    next: (response: PagedResponse<T> | null) => {
      if (!response) {
        this.resetSearchData();
      } else if (response.returnCount > 0) {
        this.found.set(response.data);
        this.totalRecords.set(response.totalCount);
        this.search.setErrors(null);
      } else {
        this.resetSearchData();
        this.search.setErrors({ error: `No ${this.itemsName} found!` });
      }
    },
    error: (err) => {
      console.error(err);
      this.search.setErrors({ error: `Error fetching ${this.itemsName}!` });
    }
  };

  abstract searchRequest(
    searchString: string
  ): Observable<T | PagedResponse<T>>;

  public resetSearchBox() {
    this.resetSearchData();
    this.search.setValue('', { emitEvent: true });
  }

  protected resetSearchData() {
    this.found.set([]);
    this.first.set(0);
    this.totalRecords.set(0);
  }

  protected onSelected(item: T) {
    this.selected.emit(item);
  }

  protected getFirstError() {
    return Object.values(this.search.errors)[0] ?? 'Unknown error';
  }
}
