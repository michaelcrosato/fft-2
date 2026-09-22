// ============================================================================
//  Chapter III — "The Brave and the Damned": story steps, in play order.
//  Flags set here (besides every battle id):
//    ch3_start          — the chapter has begun
//    ch3_lesandre_done  — Lesandre fought; the Colgrave "Ghost of the Colliery"
//                         side quest keys on this
//    rhen_heretic       — Rhen has been branded a heretic by the Church
//    alys_taken         — Alys abducted from Orvelle (the Vessel)
//    has_scriptures     — Rhen carries the Germaine Scriptures
//    malik_demand       — Malik's demand heard in Dorhaven
//    isidore_slain      — Volmar has killed his son at Riverain
//    ch3_done           — the chapter is complete
// ============================================================================
import type { StoryStep } from '../types';

export const story: StoryStep[] = [
  {
    id: 'ch3_open', chapter: 3,
    pre: 'c3_title',
    objective: 'The Pride War has begun. Take word of the Church\'s treachery to Zander in Lesandre.',
    flags: ['ch3_start'], unlock: ['colgrave'], tier: 5,
  },
  {
    id: 'ch3_colgrave', chapter: 3, at: 'colgrave',
    pre: 'c3_colgrave_pre', battle: 'b_colgrave', post: 'c3_colgrave_post',
    objective: 'Colgrave: a stargazer is set upon by cutpurses in the coal streets.',
    unlock: ['lesandre', 'sedge'],
  },
  {
    id: 'ch3_zander', chapter: 3, at: 'lesandre', chain: true,
    pre: 'c3_lesandre_zander',
    objective: 'Lesandre: seek out Zander at the Valorne house in the capital.',
  },
  {
    id: 'ch3_lesandre', chapter: 3,
    pre: 'c3_lesandre_pre', battle: 'b_lesandre', post: 'c3_lesandre_post',
    objective: 'Lesandre: the Inquisitor has come for you in the royal plaza.',
    flags: ['ch3_lesandre_done', 'rhen_heretic'], unlock: ['orvelle', 'grogmoor'],
  },
  {
    id: 'ch3_vault2', chapter: 3, at: 'orvelle', chain: true,
    pre: 'c3_orvelle_arrive', battle: 'b_orvelle_b2', post: 'c3_vault2_post',
    objective: 'Orvelle Abbey: the Sanctum Knights are sacking the vaults. Descend.',
  },
  {
    id: 'ch3_vault3', chapter: 3, chain: true,
    pre: 'c3_vault3_pre', battle: 'b_orvelle_b3', post: 'c3_vault3_post',
    objective: 'Orvelle Abbey, third vault: stop Isidore Tengel.',
  },
  {
    id: 'ch3_chapel', chapter: 3, chain: true,
    pre: 'c3_chapel_pre', battle: 'b_orvelle_b1', post: 'c3_chapel_post',
    objective: 'Orvelle Abbey chapel: Alys is in danger.',
    flags: ['alys_taken'],
  },
  {
    id: 'ch3_scriptures', chapter: 3,
    pre: 'c3_simeon',
    objective: 'Brother Simeon has something to give you.',
    flags: ['has_scriptures'], tier: 6,
  },
  {
    id: 'ch3_grogmoor', chapter: 3, at: 'grogmoor',
    pre: 'c3_grogmoor_pre', battle: 'b_grogmoor', post: 'c3_grogmoor_post',
    objective: 'Take the drovers\' road over Grogmoor Hill, toward Dorhaven and word of Alys.',
    unlock: ['dorhaven'],
  },
  {
    id: 'ch3_malik_demand', chapter: 3, at: 'dorhaven',
    pre: 'c3_dorhaven_malik',
    objective: 'Dorhaven: find a broker who saw where the Sanctum knight rode.',
    flags: ['malik_demand'], unlock: ['yardale'],
  },
  {
    id: 'ch3_oren', chapter: 3, at: 'yardale', chain: true,
    pre: 'c3_oren_road',
    objective: 'Yardale: the north road to Riverain runs through the fort town.',
  },
  {
    id: 'ch3_yardale', chapter: 3,
    pre: 'c3_yardale_pre', battle: 'b_yardale', post: 'c3_yardale_post',
    objective: 'Yardale: a woman is cornered by Riverain\'s assassins at the south gate.',
    unlock: ['yewgrove'], join: ['rana'],
  },
  {
    id: 'ch3_yewgrove', chapter: 3, at: 'yewgrove',
    pre: 'c3_yewgrove_pre', battle: 'b_yewgrove', post: 'c3_yewgrove_post',
    objective: 'Yewgrove: cross the grave-grove on the road to Riverain.',
  },
  {
    id: 'ch3_barrington', chapter: 3,
    pre: 'c3_barrington',
    objective: 'Riverain Castle lies beyond the grove.',
    unlock: ['riverain'],
  },
  {
    id: 'ch3_gate', chapter: 3, at: 'riverain', chain: true,
    pre: 'c3_gate_pre', battle: 'b_riverain_gate', post: 'c3_gate_post',
    objective: 'Riverain Castle: force the gate. Alys is inside.',
  },
  {
    id: 'ch3_beleth', chapter: 3, chain: true,
    pre: 'c3_beleth_pre', battle: 'b_beleth', post: 'c3_beleth_post',
    objective: 'Riverain keep: someone is waiting in the throne hall.',
  },
  {
    id: 'ch3_vessel', chapter: 3, chain: true,
    pre: 'c3_vessel',
    objective: 'Find Alys in the upper halls of Riverain.',
    flags: ['isidore_slain'],
  },
  {
    id: 'ch3_roof', chapter: 3, chain: true,
    pre: 'c3_roof_pre', battle: 'b_riverain_roof', post: 'c3_roof_post',
    objective: 'Riverain rooftop: the Grand Duke has fled upward.',
  },
  {
    id: 'ch3_malik', chapter: 3,
    pre: 'c3_malik_revived',
    objective: 'Malik lies still on the leads.',
    join: ['malik'],
  },
  {
    id: 'ch3_end', chapter: 3,
    pre: 'c3_end',
    objective: 'Seek out Delan Harrow in the east. Volmar has taken Alys.',
    flags: ['ch3_done'], unlock: ['dogol', 'bervaine', 'finneth', 'dolbar'],
  },
];
