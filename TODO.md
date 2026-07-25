# Cave Interior - TODO

## Files Modified
- [x] `src/scenes/CaveScene.ts` - Main cave scene (COMPLETE - world building only)
- [x] `src/main.ts` - CaveScene already registered

## Cave Layout (4500 x 2200)
- [x] Cave Entrance (250, 200) - stone arch, pillars, torches
- [x] Narrow Tunnel - winding path from entrance to sheep pen
- [x] Sheep Pen (600, 1000) - circular fenced area with gap entries
- [x] Storage Chamber (1350, 1000) - broken carts, barrels, Greek weapons
- [x] Bone Chamber (2200, 800) - bones, skulls, handprints, chains, footprints
- [x] Central Corridor (3050, 1000) - winding corridor with side chamber loop
- [x] Boss Arena Entrance (4050, 1000) - broken columns, Greek debris, gateway arch

## World Details
- [x] Rock walls (collision boundaries)
- [x] Stone pillars
- [x] Wooden fences (sheep pen)
- [x] Broken carts (storage)
- [x] Bones & skulls (bone chamber)
- [x] Torches (wall torches throughout)
- [x] Destroyed crates (storage)
- [x] Large footprints (bone chamber)
- [x] Ancient Greek debris (storage, boss entrance)
- [x] Collapsed passages (rubble in central corridor)
- [x] Small side paths (central corridor loop)
- [x] Natural elevation changes (visual color shifts)

## Systems
- [x] CollisionManager - complete wall collision coverage
- [x] CameraManager - bounds set to 4500x2200
- [x] DebugOverlay - F3 toggle for collision visualization
- [x] Intro sequence - "The Cave of the Cyclops" title

## Verification
- [x] `npx tsc --noEmit` - no CaveScene errors
- [x] `npm run build` - builds successfully
- [ ] `npm run dev` - test cave navigation (manual)
- [ ] Verify no missing collisions
- [ ] Verify no camera issues
- [ ] Verify no stuck locations
- [ ] Verify console errors
