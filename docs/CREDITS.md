# Credits

## People
- **Kell Enow**: concept, product decisions, field measurements.
- **Kris Brown** ([Bookee2](https://github.com/Bookee2/SkillZ) on GitHub): the base 3D model of West Deck (`assets/west_deck_plain.glb`), used with permission. It is not covered by this repository's MIT licence.
- **Kell Enow** checked the model against the deck on foot and extended the viewer around it: the north and south bays, the entrances and exit to campus, faculty parking, level tags and live colouring (code written with AI assistants).
- **AI coding assistants**: Claude (Anthropic) and Codex (OpenAI) wrote code under Kell's direction. See [CONTRIBUTIONS.md](CONTRIBUTIONS.md).

## Code and models
| What | Licence | Used for |
|---|---|---|
| [YOLOX](https://github.com/Megvii-BaseDetection/YOLOX) (YOLOX-s weights, release 0.1.1rc0) | Apache-2.0 | Vehicle detection |
| [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) 1.20.1 | MIT | Running the model in the browser |
| [three.js](https://github.com/mrdoob/three.js) 0.170.0 | MIT | 3D view |
| [Barlow](https://github.com/jpt/barlow) typeface, via Fontsource | SIL Open Font License 1.1 | Headings, numbers and text; embedded in the page |
| [esbuild](https://github.com/evanw/esbuild) 0.24.0 | MIT | Bundling (build time only) |
| [Playwright](https://github.com/microsoft/playwright) | Apache-2.0 | Browser check (development only) |

The detection model was trained on the [COCO dataset](https://cocodataset.org/).

## Data behind the 3D model (as stated by its author)
USGS 3DEP lidar (public domain) · USDA NAIP aerial imagery (public domain) · level count from © OpenStreetMap contributors (ODbL).

## Sources consulted
KSU Parking and Transportation pages, the KSU Video Monitoring Standard (September 2024), and the ParkSynk senior design
project on KSU Digital Commons. Full list with dates in [EVIDENCE.md](EVIDENCE.md).
