// ============================================================================
//  Story steps — Chapter IV, first half: "For Whom the Crown".
//  Dogol Pass → Bervaine (Melisande; Delan's account) → Finneth River
//  (Zalmon) → Zeltmoor (Orland arrested) → Bedlam Wastes → Bethel (walls,
//  sluice; the Lions fall; Orland joins) → the Pontiff's peace → a stone for
//  Dorian → Germain Peak → Poskar Mere → Limbourne (gate, hall, Zepar;
//  Melisande joins). The second half (31_ch4b) opens at Castle Ygress.
//
//  Flags set here besides battle ids:
//    ch4_germain_done   — after Germain Peak (keys the Kestrel side quest)
//    bethel_north / bethel_south — which wall was scaled (scene flavour)
//    ch4a_done          — the Limbourne sequence is over
// ============================================================================
import type { StoryStep } from '../types';

export const story: StoryStep[] = [
  // --- Chapter card, and the Thunder Saint at Zeltmoor ----------------------
  {
    id: 'st4_title', chapter: 4,
    pre: 's4_title',
    objective: 'Ride east toward the free cities.',
    unlock: ['dogol', 'zekla'],
    tier: 7,
  },

  // --- 1. Dogol Pass: Melisande's accusation ---------------------------------
  {
    id: 'st4_dogol', chapter: 4, at: 'dogol',
    pre: 's4_dogol_pre', battle: 'b_dogol', post: 's4_dogol_post',
    objective: 'Take the eastern road through Dogol Pass.',
    unlock: ['bervaine'],
  },

  // --- 2. Bervaine: Melisande again; Delan's account of the Church's design ---
  {
    id: 'st4_bervaine', chapter: 4, at: 'bervaine',
    pre: 's4_bervaine_pre', battle: 'b_bervaine', post: 's4_bervaine_post',
    objective: 'Reach the free city of Bervaine.',
    unlock: ['mtbervaine', 'dolbar'],
  },
  {
    id: 'st4_delan', chapter: 4,
    pre: 's4_delan_meeting',
    objective: 'Hear what Delan has to say.',
    unlock: ['finneth'],
  },

  // --- 3. Finneth River: the Inquisitor's end --------------------------------
  {
    id: 'st4_finneth', chapter: 4, at: 'finneth',
    pre: 's4_finneth_pre', battle: 'b_finneth', post: 's4_finneth_post',
    objective: 'Make a stand against Inquisitor Zalmon at the Finneth River.',
    unlock: ['zeltmoor'],
  },
  {
    id: 'st4_arrest', chapter: 4,
    pre: 's4_orland_arrest',
    objective: 'Meanwhile, at Zeltmoor...',
  },

  // --- 4. Zeltmoor: the honour guard; Adria finds the princess ---------------
  {
    id: 'st4_zeltmoor', chapter: 4, at: 'zeltmoor',
    pre: 's4_zeltmoor_pre', battle: 'b_zeltmoor', post: 's4_zeltmoor_post',
    objective: 'Ride for Zeltmoor and warn Count Orland.',
    unlock: ['bedlam', 'zargid'],
  },

  // --- 5. Bedlam Wastes: Garrow Brask ----------------------------------------
  {
    id: 'st4_bedlam', chapter: 4, at: 'bedlam',
    pre: 's4_bedlam_pre', battle: 'b_bedlam', post: 's4_bedlam_post',
    objective: 'Follow the Black Lion\'s army south across the Bedlam Wastes.',
    unlock: ['bethel'],
  },

  // --- 6–7. Bethel: the walls, the sluice, and the night the Lions fell -----
  {
    id: 'st4_bethel_wall', chapter: 4, at: 'bethel',
    pre: 's4_bethel_wall_pre', battle: 'b_bethel_wall', post: 's4_bethel_wall_post',
    objective: 'Scale the walls of Bethel Garrison and find Count Orland.',
    chain: true,
  },
  {
    id: 'st4_bethel_sluice', chapter: 4,
    pre: 's4_sluice_pre', battle: 'b_bethel_sluice', post: 's4_sluice_post',
    objective: 'Open the great sluice of Bethel and drown the battle.',
    join: ['orland'],
    unlock: ['sedge'],
  },
  {
    id: 'st4_peace', chapter: 4,
    pre: 's4_peace',
    objective: 'The Pontiff comes down from Murondel.',
  },
  {
    id: 'st4_stone', chapter: 4,
    pre: 's4_stone',
    objective: 'Meanwhile, in Lesandre...',
    unlock: ['germain'],
  },

  // --- 8. Germain Peak: the Church's shadow-hands ---------------------------
  {
    id: 'st4_germain', chapter: 4, at: 'germain',
    pre: 's4_germain_pre', battle: 'b_germain', post: 's4_germain_post',
    objective: 'Take the southern road over Germain Peak toward Limbourne.',
    flags: ['ch4_germain_done'],
    unlock: ['poskar'],
  },

  // --- 9. Poskar Mere: the drowned knights -----------------------------------
  {
    id: 'st4_poskar', chapter: 4, at: 'poskar',
    pre: 's4_poskar_pre', battle: 'b_poskar', post: 's4_poskar_post',
    objective: 'Skirt Poskar Mere on the road to Limbourne.',
    unlock: ['limbourne'],
  },

  // --- 10–12. Limbourne Castle: the maids, the Marquis, Zepar ----------------
  {
    id: 'st4_limbourne_gate', chapter: 4, at: 'limbourne',
    pre: 's4_limbourne_gate_pre', battle: 'b_limbourne_gate', post: 's4_limbourne_gate_post',
    objective: 'Confront the Marquis Elmond at Limbourne Castle.',
    chain: true,
  },
  {
    id: 'st4_limbourne_elmond', chapter: 4,
    pre: 's4_elmond_pre', battle: 'b_limbourne_elmond', post: 's4_elmond_post',
    objective: 'Face the Marquis in his great hall.',
    chain: true,
  },
  {
    id: 'st4_zepar', chapter: 4,
    pre: 's4_zepar_pre', battle: 'b_zepar', post: 's4_zepar_post',
    objective: 'Follow the Marquis into his chapel.',
    join: ['melisande'],
    flags: ['ch4a_done'],
  },
];
