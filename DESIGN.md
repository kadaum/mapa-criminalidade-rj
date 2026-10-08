# Product design

## Direction and references

The product helps a resident move between three different geographic sources without treating them as equivalent: municipal neighborhood context, bus-stop locations and police records for whole CISP territories. The interface uses the existing navy identity, quiet white data surfaces, blue links and direct caveats. It favors a compact territorial overview over a dashboard of equal cards.

Reference: [Linear, Behind the latest design refresh](https://linear.app/now/behind-the-latest-design-refresh), official design-team article inspected 7 October 2026. We adapt its mechanism of receding secondary navigation, giving the task the strongest weight, reducing repeated borders and keeping actions predictable. This was source review, not authenticated product use.

## Source of truth

- Semantic foundation: `app/globals.css`, using the `--territory-*` roles and `.territory-*` component classes.
- Shared React primitives: `components/territory-ui.tsx`.
- Representative consumers: `app/bairros/page.tsx`, `app/bairros/[slug]/page.tsx` and the complete CISP overview in `app/regioes/[slug]/page.tsx`.
- Visual direction studies: `design88-option-a.html` and `design88-option-b.html` in the private audit artifact directory. They are static composition studies; their placeholder links do not establish functioning navigation.

## Foundations and composition

Navy marks the territorial overview. White panels hold inspectable data. Primary blue is reserved for labels and actions; muted slate carries help and source limitations. Body content starts at 16px where it leads the task, while source/help text remains at least 14px. Shared primary navigation and `TerritoryAction` targets have a minimum height of 44px.

Desktop neighborhood pages use one dominant overview with the transport feature visible beside it, followed by compact CISP rows and IBGE context. Mobile reflows every CISP into label/value rows and never requires the former 940px table scroll. Long names wrap. Motion stays limited to native scroll and disclosure behavior; the experience is intentionally silent and has no haptic dependency.

CISP pages use the same navy territorial overview and sans-serif hierarchy. The whole-area warning and available neighborhood profiles appear before analysis; quantity, rate, ranking, equivalent 12-month comparison and fixed Census denominator form one compact `TerritoryCard` before the map. The map remains a dedicated geographic section rather than competing with the title. Three highlighted indicators remain scannable, while the complete 17-indicator comparison stays in a secondary 600px table whose labeled, keyboard-focusable scroll region preserves aligned quantities, units, rates and ranks on narrow screens.

## Components and usage

`TerritoryEyebrow` labels a source or geographic layer. Use the inverse variant only on navy.

`TerritoryCard` groups one coherent source or task. Avoid nesting cards or giving every sentence its own surface.

`TerritoryAction` provides the shared 44px text action. Use the inverse variant inside the navy overview. Keep destination names stable and explicit.

```tsx
<TerritoryCard>
  <TerritoryEyebrow>IBGE · Censo 2022</TerritoryEyebrow>
  <TerritoryAction href="/bairros/centro">
    Abrir perfil territorial
  </TerritoryAction>
</TerritoryCard>
```

## Experience and feedback

Neighborhood input → page opens with CISP, transport and Census destinations → an anchor moves to the chosen section → the linked source/action remains visible → browser back/anchor navigation recovers the overview. Transport samples link individually to their real OpenStreetMap coordinates. Full source, license and download actions live in an accessible disclosure without hiding the essential provider, edit date or caveat.

CISP input → page opens with the whole-area caveat, related neighborhood/Census/transport paths when available, map and comparison actions → the 12-month summary provides the first analytical read → the map and full indicator table support deeper inspection → history, data and source links continue the task. Rankings always state their 41-CISP basis and ties; low-volume or zero previous windows keep the variation unavailable explanation. Rates remain explicitly separate from individual risk, use the fixed Censo 2022 denominator, and preserve the distinction among cases, victims and occurrence records.

The global header keeps all existing destinations and adds Bairros as a discoverable destination. On narrow screens the destinations wrap across lines rather than being removed or hidden behind horizontal scrolling.

Login and optional PWA installation are outside this public-data navigation scope.

## Evidence and exceptions

Option B was selected from two mobile/desktop neighborhood composition studies because it places transport in the first viewport while preserving the CISP bridge immediately below. For the CISP page, two source-level compositions were compared with the same real content: A retained the map-first title split; B established a navy overview followed by the compact 12-month summary and then the map. B was chosen for consistency with the approved neighborhood direction and to expose the whole-area caveat, related local paths and primary facts earlier.

These decisions are implemented in source and remain unrendered pending QA. No browser, responsive viewport, keyboard, screen-reader or runtime interaction check was performed in this constrained pass, and there is no representative-user validation. Production before/after evidence, focus/overflow inspection and mobile/desktop rendering remain release QA requirements.
