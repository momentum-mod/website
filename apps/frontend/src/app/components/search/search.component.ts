/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */

import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { of as observableOf } from 'rxjs';
import { filter, delay, takeWhile } from 'rxjs/operators';

import { NbSearchService } from './search.service';

import {
  NbOverlayRef,
  NbOverlayService,
  NbPortalDirective,
  NbThemeService
} from '@nebular/theme';
/**
 * Beautiful full-page search control.
 *
 * @stacked-example(Showcase, search/search-showcase.component)
 *
 * Basic setup:
 *
 * ```ts
 *  <nb-search type="rotate-layout"></nb-search>
 * ```
 * ### Installation
 *
 * Import `NbSearchModule` to your feature module.
 * ```ts
 * @NgModule({
 *   imports: [
 *   	// ...
 *     NbSearchModule,
 *   ],
 * })
 * export class PageModule { }
 * ```
 * ### Usage
 *
 * Several animation types are available:
 * modal-zoomin, rotate-layout, modal-move, curtain, column-curtain, modal-drop, modal-half
 *
 * It is also possible to handle search event using `NbSearchService`:
 *
 * @stacked-example(Search Event, search/search-event.component)
 *
 * @styles
 *
 * search-btn-open-fg:
 * search-btn-close-fg:
 * search-bg:
 * search-bg-secondary:
 * search-text:
 * search-info:
 * search-dash:
 * search-placeholder:
 */
@Component({
  selector: 'mom-search',
  styleUrls: ['styles/search.component.scss'],
  templateUrl: './search.component.html'
})
export class SearchComponent implements OnInit, OnDestroy {
  private alive = true;
  private overlayRef: NbOverlayRef;
  showSearchField = false;

  /**
   * Tags a search with some ID, can be later used in the search service
   * to determine which search component triggered the action, if multiple searches exist on the page.
   *
   * @type {string}
   */
  @Input() tag: string;

  /**
   * Search input placeholder
   * @type {string}
   */
  @Input() placeholder = 'Search...';

  /**
   * Hint showing under the input field to improve user experience
   *
   * @type {string}
   */
  @Input() hint = 'Hit enter to search';

  /**
   * Search design type, available types are
   * modal-zoomin, rotate-layout, modal-move, curtain, column-curtain, modal-drop, modal-half
   * @type {string}
   */
  @Input() type: string;

  @ViewChild(NbPortalDirective, { static: false })
  searchFieldPortal: NbPortalDirective;
  @ViewChild('searchButton', { static: false })
  searchButton: ElementRef<HTMLElement>;

  constructor(
    private searchService: NbSearchService,
    private themeService: NbThemeService,
    private router: Router,
    private overlayService: NbOverlayService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(
        takeWhile(() => this.alive),
        filter((event) => event instanceof NavigationEnd)
      )
      .subscribe(() => this.hideSearch());

    this.searchService
      .onSearchActivate()
      .pipe(
        takeWhile(() => this.alive),
        filter((data) => !this.tag || data.tag === this.tag)
      )
      .subscribe(() => this.openSearch());

    this.searchService
      .onSearchDeactivate()
      .pipe(
        takeWhile(() => this.alive),
        filter((data) => !this.tag || data.tag === this.tag)
      )
      .subscribe(() => this.hideSearch());
  }

  ngOnDestroy() {
    if (this.overlayRef && this.overlayRef.hasAttached()) {
      this.removeLayoutClasses();
      this.overlayRef.detach();
    }

    this.alive = false;
  }

  openSearch() {
    if (!this.overlayRef) {
      this.overlayRef = this.overlayService.create();
      this.overlayRef.attach(this.searchFieldPortal);
    }

    this.themeService.appendLayoutClass(this.type);
    observableOf(null)
      .pipe(delay(0))
      .subscribe(() => {
        this.themeService.appendLayoutClass('with-search');
        this.showSearchField = true;
        this.changeDetector.detectChanges();
      });
  }

  hideSearch() {
    this.removeLayoutClasses();
    this.showSearchField = false;
    this.changeDetector.detectChanges();
    this.searchButton.nativeElement.focus();
  }

  search(term: string) {
    this.searchService.submitSearch(term, this.tag); // TODO figure out what to do with this service
  }

  private removeLayoutClasses() {
    this.themeService.removeLayoutClass('with-search');
    observableOf(null)
      .pipe(delay(500))
      .subscribe(() => {
        this.themeService.removeLayoutClass(this.type);
      });
  }
}
