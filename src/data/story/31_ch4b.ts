// ============================================================================
//  Chapter IV, part B — "For Whom the Crown" from Castle Ygress to the end,
//  continuing directly after `b_zepar` (story/30_ch4a.ts). From the sealed
//  vault of Orvelle onward the steps chain without a world-map stop.
// ============================================================================
import type { StoryStep } from '../types';

export const story: StoryStep[] = [
  // Interlude cutaways right after Limbourne: Zeltmoor, then the Valorne tombs.
  {
    id: 'c4b_interlude_zeltmoor', chapter: 4,
    pre: 'c4b_delan_oren', post: 'c4b_zander_tomb',
    objective: 'Melisande says a Zodiac Stone was delivered to Dorian. Hurry to Castle Ygress.',
    tier: 8,
  },
  {
    id: 'b_ygress', chapter: 4, at: 'ygress',
    pre: 'c4b_ygress_pre', battle: 'b_ygress', post: 'c4b_ygress_post',
    objective: 'Hurry to Castle Ygress before Dorian can use the Zodiac Stone.',
    unlock: ['murondel'],
  },
  // Cutaway: the Sanctum Knights question the Pontiff.
  {
    id: 'c4b_interlude_pontiff', chapter: 4,
    pre: 'c4b_pontiff_torture',
    objective: 'The Sanctum Knights have taken Alys to Murondel, the Holy See. Follow them.',
  },
  {
    id: 'b_murondel1', chapter: 4, at: 'murondel',
    pre: 'c4b_murondel1_pre', battle: 'b_murondel1', post: 'c4b_murondel1_post',
    objective: 'Enter Murondel, the Holy See, and find Alys.',
    chain: true,
  },
  {
    id: 'b_murondel2', chapter: 4,
    pre: 'c4b_murondel2_pre', battle: 'b_murondel2', post: 'c4b_murondel2_post',
    objective: 'Force your way through the cloister of the Holy See.',
    chain: true,
  },
  {
    id: 'b_murondel3', chapter: 4,
    pre: 'c4b_murondel3_pre', battle: 'b_murondel3', post: 'c4b_murondel3_post',
    objective: 'Confront Clement in the great chapel of Murondel.',
    flags: ['ch4b_pontiff_dead'],
  },
  {
    id: 'b_orvelle_b4', chapter: 4, at: 'orvelle',
    pre: 'c4b_orvelle_b4_pre', battle: 'b_orvelle_b4', post: 'c4b_orvelle_b4_post',
    objective: 'Volmar has gone to Orvelle Abbey. Descend below the old vaults.',
  },
  {
    id: 'b_orvelle_b5', chapter: 4, at: 'orvelle',
    pre: 'c4b_orvelle_b5_pre', battle: 'b_orvelle_b5', post: 'c4b_orvelle_b5_post',
    objective: 'Descend to the sealed vault of Orvelle. There will be no turning back — prepare well.',
    chain: true, moveTo: 'murondel',
  },
  {
    id: 'b_necropolis', chapter: 4,
    pre: 'c4b_necropolis_pre', battle: 'b_necropolis', post: 'c4b_necropolis_post',
    objective: 'Find a way out of the Necropolis of Murondel.',
    chain: true,
  },
  {
    id: 'b_lostsanctum', chapter: 4,
    pre: 'c4b_lostsanctum_pre', battle: 'b_lostsanctum', post: 'c4b_lostsanctum_post',
    objective: 'Cross the Lost Sanctum.',
    chain: true, unlock: ['airship'], moveTo: 'airship',
  },
  {
    id: 'b_astaroth', chapter: 4,
    pre: 'c4b_astaroth_pre', battle: 'b_astaroth', post: 'c4b_astaroth_post',
    objective: 'Stop Volmar in the Airship Graveyard and save Alys.',
    chain: true,
  },
  {
    id: 'b_altessa', chapter: 4,
    pre: 'c4b_altessa_pre', battle: 'b_altessa', post: 'c4b_altessa_post',
    objective: 'Defeat Altessa, the Crimson Seraph, and free Alys.',
    chain: true,
  },
  // Epilogue: the empty grave at Orvelle, then the crown and the knife.
  {
    id: 'c4b_epilogue', chapter: 4,
    pre: 'c4b_epilogue_funeral', post: 'c4b_epilogue_crown',
    objective: 'The End.',
    flags: ['game_complete'],
  },
];
