import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject
} from '@angular/core';
import {
  Gamemode,
  Leaderboard,
  LeaderboardStats,
  LeaderboardType,
  MapReview,
  MapReviewSuggestion,
  MapStatusChangeRules,
  MapStatusName,
  MapStatus,
  MapSubmissionApproval,
  MapSubmissionSuggestion,
  MIN_PUBLIC_TESTING_DURATION,
  MMap,
  PagedResponse,
  Role,
  TrackType,
  MapTag,
  DisabledGamemodes
} from '@momentum/constants';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ChartModule } from 'primeng/chart';
import { arrayFrom, leaderboardKey } from '@momentum/util-fn';
import { ChartData } from 'chart.js';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { firstValueFrom, forkJoin } from 'rxjs';
import { IterableElement } from 'type-fest';
import { MapFinalApprovalFormComponent } from './map-final-approval-form.component';
import { MapsService } from '../../../services/data/maps.service';
import { LeaderboardsService } from '../../../services/data/leaderboards.service';
import { DatePipe, NgClass } from '@angular/common';
import { LocalUserService } from '../../../services/data/local-user.service';

export type GroupedLeaderboards = Map<
  Gamemode,
  {
    leaderboards: Array<
      Leaderboard & {
        totalRuns: number;
        subSugg?: MapSubmissionSuggestion;
        reviews: MapReviewSuggestion[];
        graphs: { tiers: ChartData; ratings: any };
        averageTier?: number;
        averageRating?: number;
        reviewTags?: Array<[MapTag, number]>;
        tier: number | null;
        type: Exclude<LeaderboardType, LeaderboardType.IN_SUBMISSION> | null;
      }
    >;
    totalRuns: number;
  }
>;

@Component({
  selector: 'm-map-status-form',
  templateUrl: 'map-status-form.component.html',
  imports: [
    DatePickerModule,
    SelectModule,
    ChartModule,
    MapFinalApprovalFormComponent,
    DatePipe,
    ReactiveFormsModule,
    NgClass
  ]
})
export class MapStatusFormComponent implements OnChanges {
  private readonly mapsService = inject(MapsService);
  private readonly leaderboardsService = inject(LeaderboardsService);
  private readonly messageService = inject(MessageService);
  private readonly localUserService = inject(LocalUserService);

  protected readonly MapStatus = MapStatus;
  protected readonly MapStatusName = MapStatusName;
  protected readonly MIN_PUBLIC_TESTING_DURATION = MIN_PUBLIC_TESTING_DURATION;
  @Input({ required: true }) map: MMap;
  @Input({ required: true }) sub: boolean;

  @Input({ required: true }) formGroup: FormGroup<{
    status: FormControl<MapStatus>;
    finalLeaderboards: FormControl<MapSubmissionApproval[]>;
  }>;

  protected status: MapStatus;
  protected possibleStatuses: Array<{
    label: string;
    value: MapStatus | -1; // PrimeNG component behaves weirdly for `null`
  }> = [];

  protected firstEnteredPublicTesting: number;
  protected isBlockedForUnresolvedReviews: boolean;
  protected isBlockedForSubmissionTimeGate: boolean;
  protected isBlockedForNoApprovingReview: boolean;
  protected hasBeenApprovedBefore: boolean;

  protected loading = false;

  protected groupedLeaderboards: GroupedLeaderboards = new Map();

  async ngOnChanges(changes: SimpleChanges) {
    if (!changes['map'] || !this.map) return;
    this.isBlockedForUnresolvedReviews = false;
    this.isBlockedForSubmissionTimeGate = false;
    this.isBlockedForNoApprovingReview = false;

    this.status = this.map.status;

    this.populateStatuses();

    if (
      ![MapStatus.FINAL_APPROVAL, MapStatus.PUBLIC_TESTING].includes(
        this.status
      )
    )
      return;

    this.loading = true;
    let reviews: PagedResponse<MapReview>, leaderboardStats: LeaderboardStats[];
    try {
      [reviews, leaderboardStats] = await firstValueFrom(
        forkJoin([
          this.mapsService.getMapReviews(this.map.id, {
            take: 1000
          }),
          this.leaderboardsService.getLeaderboardStats(this.map.id)
        ])
      );
    } catch (httpError) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error fetching map summary data!!',
        detail: httpError.error.message
      });
      this.loading = false;
      return;
    }

    this.setupFinalApprovalForm(leaderboardStats, reviews.data);
    this.hasBeenApprovedBefore = Boolean(this.map.info.approvedDate);

    this.firstEnteredPublicTesting = new Date(
      this.map.submission.dates.findLast(
        ({ status }) => status === MapStatus.PUBLIC_TESTING
      )?.date
    ).getTime();
    this.isBlockedForSubmissionTimeGate =
      !(this.mod || this.adm) &&
      Date.now() - this.firstEnteredPublicTesting < MIN_PUBLIC_TESTING_DURATION;

    // Could use MapReviewStats here but we need to fetch the entirely of the
    // map reviews to display the review suggestions graphs anyway.
    this.isBlockedForUnresolvedReviews = reviews.data.some(
      ({ resolved }) => resolved === false
    );

    this.isBlockedForNoApprovingReview = false; //|| !reviews.data.some(({ approves }) => approves);

    if (
      this.isBlockedForSubmissionTimeGate ||
      this.isBlockedForUnresolvedReviews ||
      this.isBlockedForNoApprovingReview
    ) {
      this.possibleStatuses.splice(
        this.possibleStatuses.findIndex(
          ({ value }) => value === MapStatus.FINAL_APPROVAL
        ),
        1
      );
    }

    this.loading = false;
  }

  // This is all so heavily dependent on map and review data that we construct
  // all this graph stuff here, then pass it to the child m-final-approval-form
  // component, which actually renders it.
  setupFinalApprovalForm(
    leaderboardStats: LeaderboardStats[],
    reviews: MapReview[]
  ) {
    const subSuggs = this.map.submission.suggestions;
    const reviewSuggs = reviews.flatMap(({ suggestions }) => suggestions);
    const arr10 = arrayFrom(10, (i) => i + 1);
    const style = getComputedStyle(document.documentElement);
    const tierColors = arr10.map((k) => style.getPropertyValue(`--tier-${k}`));
    const ratingColors = ['blue', 'green', 'orange', 'red', 'purple'].map(
      (color) => style.getPropertyValue(`--${color}-500`)
    );

    const leaderboards = leaderboardStats
      .filter((stats) => !DisabledGamemodes.has(stats.leaderboard.gamemode))
      .map(({ leaderboard, totalRuns }) => {
        const matchTrack = ({ gamemode, trackType, trackNum }) =>
          leaderboard.gamemode === gamemode &&
          leaderboard.trackType === trackType &&
          leaderboard.trackNum === trackNum;

        const subSugg = subSuggs.find((sugg) => matchTrack(sugg));
        const reviews = reviewSuggs.filter((review) => matchTrack(review));

        const r: IterableElement<GroupedLeaderboards>[1]['leaderboards'][0] = {
          ...leaderboard,
          totalRuns,
          subSugg,
          reviews,
          graphs: {
            tiers: {
              labels: arr10,
              datasets: [
                {
                  data: arr10.map(
                    (k) => reviews.filter(({ tier }) => tier === k).length
                  ),
                  backgroundColor: tierColors.map(
                    (color) =>
                      `color-mix(in hsl, rgb(${color}), 100% hsl(none 50 50))` // Lower saturation, lighten a bit. Going a bit mad today.
                  ),
                  categoryPercentage: 1,
                  barPercentage: 1
                }
              ]
            },
            ratings: {
              labels: arr10,
              datasets: [
                {
                  data: arr10.map(
                    (k) =>
                      reviews.filter(
                        ({ gameplayRating }) => gameplayRating === k
                      ).length
                  ),
                  backgroundColor: arr10.map(
                    (i) =>
                      `color-mix(in hsl, rgb(${
                        ratingColors[i % 5]
                      }), 100% hsl(none 50 50))`
                  ),
                  categoryPercentage: 1,
                  barPercentage: 1
                }
              ]
            }
          },
          // These are the actual values that the form mutates
          tier: null,
          type: LeaderboardType.HIDDEN
        };

        if (reviews.length > 0) {
          // Mean including submitter, i.e.
          let sumTiers = reviews.reduce((acc, { tier }) => acc + tier, 0);
          let totalTiers = reviews.filter(({ tier }) => tier > 0).length;
          if (subSugg?.tier > 0) {
            sumTiers += subSugg.tier;
            totalTiers++;
          }
          r.averageTier = +(sumTiers / totalTiers).toFixed(2);

          const sumRatings = reviewSuggs.reduce(
            (acc, { gameplayRating }) => acc + gameplayRating,
            0
          );
          const totalRatings = reviewSuggs.filter(
            ({ gameplayRating }) => gameplayRating != null
          ).length;

          r.averageRating = +(sumRatings / totalRatings).toFixed(2);

          r.reviewTags = reviews
            .flatMap(({ tags }) => tags)
            .reduce((arr, tag) => {
              if (!tag) return arr;
              const tuple = arr.find(([t]) => t === tag);
              if (tuple) {
                tuple[1]++;
              } else {
                arr.push([tag, 1]);
              }
              return arr;
            }, [])
            // Sort by frequency
            .sort((tupleA, tupleB) => tupleB[1] - tupleA[1]);
        }

        return r;
      });

    this.groupedLeaderboards.clear();
    for (const lb of leaderboards) {
      let group = this.groupedLeaderboards.get(lb.gamemode);
      if (!group) {
        group = { leaderboards: [], totalRuns: 0 };
        this.groupedLeaderboards.set(lb.gamemode, group);
      }
      group.leaderboards.push(lb);

      // Maybe want to include this back when we do stage tiers
      if (lb.trackType !== TrackType.STAGE) {
        group.totalRuns += lb.totalRuns;
      }
    }
  }

  populateStatuses() {
    this.possibleStatuses = [
      { label: 'No change', value: -1 },
      ...MapStatusChangeRules.filter(
        ({ from, roles }) =>
          this.status === from &&
          ((roles.includes(Role.ADMIN) && this.adm) ||
            (roles.includes(Role.MODERATOR) && this.mod) ||
            (roles.includes(Role.REVIEWER) && this.rev) ||
            (roles.includes('submitter') && this.sub))
      ).map(({ to }) => ({ value: to, label: MapStatusName.get(to) }))
    ];
  }

  isPossibleStatus(status: MapStatus) {
    return this.possibleStatuses.some(({ value }) => value === status);
  }

  protected groupLbSortFn = (a, b) => a.value.totalRuns > b.value.totalRuns;
  protected leaderboardKey = leaderboardKey;

  get statusControl() {
    return this.formGroup.get('status') as FormControl<MapStatus>;
  }

  get finalLeaderboards() {
    return this.formGroup.get('finalLeaderboards') as FormControl<
      MapSubmissionApproval[]
    >;
  }

  get rev() {
    return this.localUserService.hasRole(Role.REVIEWER);
  }

  get adm() {
    return this.localUserService.isAdmin;
  }

  get mod() {
    return this.localUserService.isMod;
  }
}
