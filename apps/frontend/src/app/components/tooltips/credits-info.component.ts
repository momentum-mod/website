import { Component } from '@angular/core';

@Component({
  selector: 'm-credits-info',
  template: `
    <div class="prose p-3">
      <p>
        Our credits system lets you link to the Momentum profile of everyone
        who's contributed to your map.
      </p>
      <p>
        If you know their Steam account but not their name in Momentum, search
        for their Steam Community ID - you can find it by pasting the full URL
        of their Steam profile into
        <b>steamid.io</b> and copying the <b>steamID64</b> value.
      </p>
      <p>
        Anyone who has ever played Momentum or signed in to our website should
        have a Momentum account. But if they don't, you can submit a
        "placeholder" credit that will generate a placeholder user for the given
        alias, when the map is approved.
      </p>
      <p>Here are some general guidelines what user goes in what category:</p>
      <ul>
        <li>
          <i>Authors: </i>the primary creator(s) of the map. Bonus creators
          should be included, but describe them as e.g. "Bonus 1", and put them
          after main track authors.
        </li>
        <li><i>Contributors: TODO: IM BORED DOING TOMORROW</i></li>
      </ul>
    </div>
  `
})
export class CreditsInfoComponent {}
