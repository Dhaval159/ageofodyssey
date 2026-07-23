export const CombatEvents = {
  ATTACK_START: "combat:attack-start",
  ATTACK_HIT: "combat:attack-hit",
  ATTACK_END: "combat:attack-end",
  DAMAGE_DEALT: "combat:damage-dealt",
  DAMAGE_TAKEN: "combat:damage-taken",
  ENTITY_KILLED: "combat:entity-killed",
  HITBOX_CREATED: "combat:hitbox-created",
  HITBOX_EXPIRED: "combat:hitbox-expired",
  COMBO_STEP: "combat:combo-step",
} as const;
