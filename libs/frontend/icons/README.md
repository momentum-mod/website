# frontend-icons

List of SVG icons to bundle, as strings. We use icons from 3 sources:

1. [Material Design Icons](https://pictogrammers.com/library/mdi/) [`mdi`] - for
   general purpose icons
2. [Simple Icons](https://simpleicons.org/) [`si`] - for brands
3. Momentum-specifc [`mom`] - anything unique to Momentum or not handled by the
   other two sources. Usually made by Traz or Tom, feel free to reach out to us
   if you need anything specific.

Any icons used within the Angular application _must_ be imported and re-exported
from the above sources or bundling won't work and you'll get a type error. We
could provide everything from each icon pack and tree-shake but running our type
manipulation in `index.ts` on the entirety of @mdi/js will cause the TypeScript
language server to lock up, so we manually re-export just what we need.

Also provides a directive for `<svg>` tags that adds a `[icon]`/`[pack]`
attributes that will fill the SVG tag with the given icon.
