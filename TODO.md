# Cave Interior - TODO

## Files to Create
- [ ] `src/scenes/CaveScene.ts` - Main cave scene (IN PROGRESS)
- [x] `src/entities/world/Sheep.ts` - Sheep entity
- [x] `src/entities/world/Crate.ts` - Pushable crate (Puzzle 1)
- [x] `src/entities/world/LightableTorch.ts` - Lightable torch (Puzzle 2)
- [x] `src/entities/world/StoneGate.ts` - Stone gate (Puzzle 2)

## Files to Modify
- [ ] `src/main.ts` - Add CaveScene
- [x] `src/world/IWorldObject.ts` - Add crate and gate types

## Verification
- [ ] `npx tsc --noEmit` - no TypeScript errors
- [ ] `npm run dev` - test cave navigation
- [ ] Verify crate puzzle works
- [ ] Verify torch puzzle works
- [ ] Verify objectives update
- [ ] Verify checkpoints work
- [ ] Verify boss arena exists
- [ ] Verify sheep exist
- [ ] Verify crew NPC with dialogue
