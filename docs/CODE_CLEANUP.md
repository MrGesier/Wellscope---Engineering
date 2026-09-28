# Brand and runtime cleanup

- Remove the tracked Alpha 0.2 copy: obsolete executable UI, duplicated engine/test and historical screenshots. Git history retains that snapshot. Current engines, project schema and report records are preserved.
- Replace the circle logo with the original Strata vector; remove duplicate old ICOs. The versioned current ICO avoids Windows stale-icon caching.
- Remove obsolete advanced-navigation styles and move the remaining injected CSS into the shared stylesheet.
- Compute the dashboard survey once per prepared report; cache at most 32 exact-depth samples. Input invalidation clears the cache. Slider events are coalesced to the latest animation frame; direct depth entry remains synchronous.
- Correct blank workspace breadcrumbs and outdated onboarding documentation.

The specialist workspaces still support saved projects and existing source-backed studies, so they are not deleted merely because they are absent from the main menu. No solver equation or unit conversion is changed.
