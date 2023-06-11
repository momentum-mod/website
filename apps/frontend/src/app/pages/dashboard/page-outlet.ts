// Previous Nebular update (circa v7-10) breaks overlays for lazy-loaded modules
// https://github.com/akveo/nebular/issues/943. Either that or I've done
// something wrong whilst upgrading, but judging by that issue I don't think I
// have. Meaning we have to wrap everything in that module in an extra layer of
// this shite. Adds a bunch more nesting to the DOM, I'm not at all happy about
// it, but yeah.
//
// I *have* tried wrapping the outermost <router-outlet> in these (see gh
// thread) but doesn't work. Maybe worth having another go at improving this
// when we remove the frontpage, the app component can then have the template
// structure as dashboard has atm.
// See https://github.com/momentum-mod/website/issues/739
export const NB_LAYOUT_WRAPPED_OUTLET = `<nb-layout class="page-outlet">
  <nb-layout-column class="page-outlet__column">
    <router-outlet></router-outlet>
  </nb-layout-column>
</nb-layout>`;
