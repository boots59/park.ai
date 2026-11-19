# West Parking Deck model (Kennesaw State University)

A measured 3D model of the West Parking Deck at 3510 Campus Loop Rd, built for a parking-availability website.

## Files

| File | Use |
|---|---|
| `WestDeck_model.blend` | The model in Blender (5.2, 148 KB): the same named levels, bays, stall lines and structure, with a sun and a camera. Edit it here, then export glTF. |
| `west_deck.glb` | The model, Draco-compressed (38 KB). Load it with three.js `GLTFLoader` plus `DRACOLoader`. |
| `west_deck_plain.glb` | The same model without compression (277 KB), for loaders that have no Draco decoder. |
| `west_deck.json` | Levels, zones and the model's stall count per zone. |
| `deck_live.html` | The demo page: three.js 0.170 `WebGPURenderer`, which falls back to WebGL 2 by itself. |
| `starter/` | The place to start: `index.html`, one short commented page, plus `west_deck.glb`. The card shows a level-by-bay grid of open counts, and each bay on the model carries a count badge. Bays are tinted from a `counts` object, and `updateCounts()` takes live data. "Stagger levels" spreads the levels into a staircase so every bay can be tapped. |

## What's inside

- **Levels:** three groups, `Level_1`, `Level_2` and `Level_3` (the top deck). Move a group's `position.y` to lift that level apart.
- **Zones:** each level has three, one mesh and one material each, named `L<level>_<West|Centre|East>` (material `Zone_L<level>_…`). They are thin surfaces 4 cm above the floor. Recolour the material to show availability.
  - **West bay:** one-way northbound.
  - **Centre:** the ramp bay. It rises 4.9 % from south to north, one level per run.
  - **East bay:** one-way southbound.
- **Per level:** `L<n>_Slab` (floors and ramp), `L<n>_Structure` (spandrel panels, ramp walls, columns) and `L<n>_Stripes` (stall lines).
- **Shared:** `Deck_Tower` is the NE stair and lift. The top deck also has `L3_Poles`.

## Units and axes

- **Units:** metres. glTF is Y-up.
- **Ground:** y = elevation − 300 m above sea level (NAVD88).
  - Level 1 floor: y = 13.0.
  - Level 2: 16.05.
  - Level 3: 19.15.
- **Horizontal:** x points east and −z points north. The origin is the deck's south-west corner.

## Colouring a zone from live counts (three.js)

```js
const zone = gltf.scene.getObjectByName('L2_West');
zone.material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
// open ≥ 40 % → green, 15–40 % → amber, < 15 % → red
```

## What is measured and what is modelled

**Measured:**
- **From USGS 3DEP lidar** (GA statewide, flown April 2019):
  - the outline: 118.6 × 55.4 m, 58.1 m wide at the north end;
  - the top deck at 319.15 m;
  - the ramp bay;
  - 3.1 m between floors.
- **From the USDA NAIP aerial photo** (October 2025): the stall module of 2.61 m along the aisle, angled about 76°.
- **From KSU:** 7 ft 2 in clearance, its only published figure.

**Modelled:**
- **Level count:** 3, taken from OpenStreetMap. The lidar would allow up to 5, so confirm with KSU.
- **Lower levels:** levels 1 and 2 repeat the top deck's layout.
- **Stall counts:** 651 in the model (level 1: 187, level 2: 232, level 3: 232). These are the model's numbers. Take the real counts per level and bay from KSU Parking & Transportation or from the counting system that will feed the site.
