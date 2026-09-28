# WellScope identity — Strata

Original vector symbol: terracotta strata crossed by an ivory directional well, on a deep earth tile. The compact geometry is designed for the sidebar, favicon and Windows launcher.

Colours: earth #38291F, terracotta #A84932, clay #CB7654, sandstone #E6AE83, ivory #FFF1DA.

Source: app/assets/wellscope-logo.svg. Run `npm run build:brand` to reproduce the 1024 px PNG and the seven-resolution Windows ICO (16–256 px). The installer uses wellscope-strata-v3.ico to avoid the old Windows icon cache. The superseded circle icon and duplicate ICO have been removed.

The production asset is drawn directly in SVG; it needs no external fonts, network requests or runtime renderer. The resvg renderer is a development-only dependency.
