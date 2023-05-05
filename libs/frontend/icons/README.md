# frontend-icons

List of SVG icons to bundle, as strings. We use icons from 3 sources:

1. [Material Design Icons](https://pictogrammers.com/library/mdi/) [`mdi`] - for general purpose icons
2. [Simple Icons](https://simpleicons.org/) [`si`] - for brands
3. Momentum-specifc [`mom`] - anything unique to Momentum or not handled by the other two sources. Usually made by Traz or Tom, feel free
   to reach out to us if you need anything specific.

Any icons used within the Angular application _must_ be exported here so
it gets bundled properly. An Angular directive will yell at you if you don't.
