// ============================================================================
//  Chapter II — "Pawn and Player": story steps, in order.
//  Battles: src/data/battles/ch2.ts · Scenes: src/data/scenes/ch2.ts
//  Flags set here (besides every battle id):
//    ch2_start, bocco_joined, delan_alive, garmond_betrayed, mattis_joined,
//    oriane_at_lyonesse, has_taurus_stone, ev_delan_current, adria_rejoined,
//    garmond_dead, has_scorpio_stone, oriane_with_galtran, pride_war, ch2_complete
//  Scene flags (choices): ch2_bocco_gladly, ch2_zelland_helped
// ============================================================================
import type { StoryStep } from '../types';

export const story: StoryStep[] = [
  // --------------------------------------------------------------------------
  //  Chapter card and the pursuit from Orvelle
  // --------------------------------------------------------------------------
  {
    id: 'ch2_open', chapter: 2,
    pre: 'ch2_title', post: 'ch2_pursuit',
    objective: 'Pursue the princess\'s abductor south from Orvelle.',
    join: ['adria'],
    tier: 3,
    unlock: ['dorhaven'],
    moveTo: 'dorhaven',
    flags: ['ch2_start'],
  },

  // --------------------------------------------------------------------------
  //  1. Dorhaven
  // --------------------------------------------------------------------------
  {
    id: 'st_dorhaven2', chapter: 2, at: 'dorhaven',
    pre: 'dorhaven2_bribe', battle: 'b_dorhaven2', post: 'dorhaven2_after',
    objective: 'Seek word of the princess in the back streets of Dorhaven.',
    unlock: ['arawen'],
  },

  // --------------------------------------------------------------------------
  //  2. Arawen Woods — Bocco
  // --------------------------------------------------------------------------
  {
    id: 'st_arawen', chapter: 2, at: 'arawen',
    pre: 'arawen_bocco', battle: 'b_arawen', post: 'arawen_after',
    objective: 'Follow the kwehbo tracks south into Arawen Woods.',
    join: ['bocco'],
    unlock: ['zirkel'],
    flags: ['bocco_joined'],
  },

  // --------------------------------------------------------------------------
  //  3. Zirkel Falls — Delan, Oriane and Garmond's betrayal
  // --------------------------------------------------------------------------
  {
    id: 'st_zirkel', chapter: 2, at: 'zirkel',
    pre: 'zirkel_standoff', battle: 'b_zirkel', post: 'zirkel_after',
    objective: 'Catch the rider at Zirkel Falls.',
    unlock: ['zelland'],
    flags: ['delan_alive', 'garmond_betrayed'],
  },

  // --------------------------------------------------------------------------
  //  4. Zelland — Mattis
  // --------------------------------------------------------------------------
  {
    id: 'st_zelland', chapter: 2, at: 'zelland',
    pre: 'zelland_mattis', battle: 'b_zelland', post: 'zelland_after',
    objective: 'Escort Princess Oriane south through Zelland.',
    join: ['mattis'],
    flags: ['mattis_joined'],
  },
  {
    id: 'st_ch2_dorian', chapter: 2,
    pre: 'ch2_dorian_orders',
    objective: 'Take the princess over Barrow Hill to Castle Lyonesse.',
    unlock: ['barrowhill'],
  },

  // --------------------------------------------------------------------------
  //  5. Barrow Hill, and the Cardinal's audience
  // --------------------------------------------------------------------------
  {
    id: 'st_barrowhill', chapter: 2, at: 'barrowhill',
    pre: 'barrowhill_ambush', battle: 'b_barrowhill', post: 'barrowhill_after',
    objective: 'Take the princess over Barrow Hill to Castle Lyonesse.',
    unlock: ['lyonesse'],
  },
  {
    id: 'st_ch2_audience', chapter: 2,
    pre: 'lyonesse_audience',
    objective: 'Cross Zigor Fen to Cogsgard and free Mattis\'s father.',
    moveTo: 'lyonesse',
    unlock: ['zigor'],
    tier: 4,
    flags: ['oriane_at_lyonesse'],
  },

  // --------------------------------------------------------------------------
  //  6. Zigor Fen
  // --------------------------------------------------------------------------
  {
    id: 'st_zigor', chapter: 2, at: 'zigor',
    pre: 'zigor_pre', battle: 'b_zigor', post: 'zigor_after',
    objective: 'Cross Zigor Fen to Cogsgard and free Mattis\'s father.',
    unlock: ['cogsgard'],
  },

  // --------------------------------------------------------------------------
  //  7. Cogsgard — the workshop, the false stone, the Stone of Taurus
  // --------------------------------------------------------------------------
  {
    id: 'st_cogsgard_workshop', chapter: 2, at: 'cogsgard',
    pre: 'cogsgard_workshop',
    objective: 'Find Bastian Brunel in Cogsgard.',
    chain: true,
  },
  {
    id: 'st_cogsgard', chapter: 2,
    pre: 'cogsgard_exchange', battle: 'b_cogsgard', post: 'cogsgard_after',
    objective: 'Trade a false stone for Bastian Brunel at the Nine-Gear Yard.',
    unlock: ['barrowvale', 'wargill'],
    flags: ['has_taurus_stone'],
  },
  {
    id: 'st_ch2_night_road', chapter: 2,
    pre: 'delan_night_road',
    objective: 'Hurry back toward Castle Lyonesse.',
    flags: ['ev_delan_current'],
  },
  {
    id: 'st_ch2_cardinal_plot', chapter: 2,
    pre: 'cardinal_plot',
    objective: 'Return to Lyonesse by way of Barrow Vale.',
  },

  // --------------------------------------------------------------------------
  //  8. Barrow Vale — Adria as bait
  // --------------------------------------------------------------------------
  {
    id: 'st_barrowvale', chapter: 2, at: 'barrowvale',
    pre: 'barrowvale_ambush', battle: 'b_barrowvale', post: 'barrowvale_after',
    objective: 'Return to Lyonesse by way of Barrow Vale.',
    join: ['adria'],
    unlock: ['golgrand'],
    flags: ['adria_rejoined'],
  },

  // --------------------------------------------------------------------------
  //  9. Golgrand Gallows
  // --------------------------------------------------------------------------
  {
    id: 'st_golgrand', chapter: 2, at: 'golgrand',
    pre: 'golgrand_pre', battle: 'b_golgrand', post: 'golgrand_after',
    objective: 'Reach Golgrand Gallows before the turn of the tide.',
  },

  // --------------------------------------------------------------------------
  //  10–11. Castle Lyonesse — Garmond's end, and the Defiled King
  // --------------------------------------------------------------------------
  {
    id: 'st_lyonesse', chapter: 2, at: 'lyonesse',
    pre: 'lyonesse_gate_pre', battle: 'b_lyonesse', post: 'lyonesse_gate_after',
    objective: 'Storm the gate of Castle Lyonesse.',
    chain: true,
    flags: ['garmond_dead'],
  },
  {
    id: 'st_vepar', chapter: 2,
    pre: 'vepar_pre', battle: 'b_vepar', post: 'vepar_after',
    objective: 'Confront Cardinal Dracomir in the castle chapel.',
    chain: true,
    flags: ['has_scorpio_stone', 'oriane_with_galtran'],
  },
  {
    id: 'st_ch2_end', chapter: 2,
    pre: 'ch2_galtran', post: 'ch2_pride_war',
    objective: 'The Pride War has begun.',
    unlock: ['colgrave'],
    flags: ['pride_war', 'ch2_complete'],
  },
];
