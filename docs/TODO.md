# Engine TODO (from content agents' reports)

## Items
- [ ] on-hit spells (`onHit.spell`) never fire — apply in hitUnit for weapon attacks
- [ ] weapon HP drain (Blood Sword, Bloody Strings) — add `drain?: boolean` to ItemDef
- [ ] weapons that heal / cure on hit (Healing Staff, White Staff, Octagon Pole)
- [ ] thrown items use their own element (orbs, Ice Brand)
- [ ] per-job / per-character equipment lock (Otherworld Blade → wanderer)
- [ ] magicGun damage should be faith-scaled magic (WP×WP too strong)
- [ ] "invite" immunity for Ribbon/Barrette/Cursed Ring
- [ ] re-apply `always` statuses (reraise) after revive

## Jobs 2
- [ ] Mimic should copy Jump/Throw/Iaido/perform (special.start and charged)
- [ ] Counter Flood should pick terrain effect (reaction uses subAction → geoAuto path)
- [ ] Iaido/Geomancy: apply magic attack/defense modifiers without silence
- [ ] Bosses immune to instant KO status riders (Lava Ball)
- [ ] AI overvalues random-status abilities; AI ignores MP damage
- [ ] Vertical jump default 2 → make default 1

## Jobs 1
- [ ] Twelvefold: skillsetActions should include learned abilities whose `skillset` matches (not only job.abilities)
- [ ] Magic evasion per-ability flag (`mevadable`), default: status spells evadable, white/time buffs not
- [ ] Golem: damage-absorb pool
- [ ] Gravity: % of max HP (spec says max)
- [ ] Toad on a toad cures it
- [ ] Speechcraft permanent Brave/Faith drift (1/4 of battle change at end) — implement in battle end
- [ ] monsterTalk: orator skills only work on monsters with Beast Speech; train
- [ ] Sunder/Steal Shield should find the shield in either hand
- [ ] Raise/Phoenix Down targeting live undead (target 'ko' filters them out)
- [ ] Ribbon equip rule consistency (all jobs can wear ribbons if female)
