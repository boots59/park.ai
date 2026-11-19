# How the West Deck 3D model was made, and how to learn it

## What your friend's pipeline does
From the SkillZ notes (`skills/capra-realtorfilm/references/structures.md`). The scripts themselves are **not public**:
they live on their author's computer, so the steps below are a description, not runnable code.

1. **Fetch** public data for a box around the deck: USGS 3DEP lidar (LAZ point cloud), a 1 m elevation model, a USDA NAIP aerial photo.
2. **Measure**: line up the OpenStreetMap outline with the lidar's building points; take the top-deck height from the lowest
   10% of points per 0.5 m cell (cars sit above the slab); find lower floors from pulses that slipped through the open sides
   (a histogram of heights shows peaks at each slab).
3. **Stalls**: find stripe angle and spacing in the aerial photo with a shear search plus an FFT along a row.
4. **Layout**: generate levels, bays, ramp, columns and every stall from those measurements.
5. **Blender**: build the meshes, name them (`L2_West`…), export glTF (`.glb`).

## What you can learn first, in this repo (no Blender needed)
1. **Read `src/viewer.js`.** About 100 lines: load a GLB, find meshes by name, change a material colour, raycast a tap.
2. **Exercise:** colour bays by *count* instead of freshness (e.g. darker green = more open). Add a test, then decide whether
   it misleads (a count of 2 in a 79-stall bay is not "green").
3. **Exercise:** add a text label floating over each bay (`CSS2DRenderer` from three.js).
4. **Exercise:** open the model file `west_deck_plain.glb` (from your collaborator's zip) in https://gltf-viewer.donmccurdy.com/ to see the scene tree.

## Then the measuring side (Python, needs Blender later)
1. Install Blender (free) and open `WestDeck_model.blend` (in the original zip). Select `Level_2`, move it, export glTF.
2. Python with `laspy`, `numpy`: download one 3DEP LAZ tile over the deck from the USGS National Map, then
   **reproduce one number yourself**: histogram the point heights inside the deck outline and see whether you get slab
   peaks about 3.1 m apart. That is an independent check of your friend's model, and a good project-log entry.
3. **The open question worth answering:** how many levels does West Deck really have? Lidar alone can't settle it. A walk
   with a notebook can, as can KSU's parking map.

## Limits to remember
The model shows **where bays are**. It does not detect cars. Its stall counts are generated, not counted.
