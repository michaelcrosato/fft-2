// ============================================================================
//  Side quests (SideQuestStep[]). A step is offered at its world node once all
//  `needs` flags are set, the chapter window fits and every `needChar` is in
//  the party. On completion its battle id (if any) and `flags` are set.
//  Completion flags used by the cast bios: sq_colliery, sq_octo, sq_nevel,
//  sq_flower, sq_kestrel, sq_deep.
//  Scene-set flags: sq_flower / sq_flower_declined (Aline's choice; buying on a
//  later visit clears sq_flower_declined), sq_beorn_welcomed, learn_twelvefold.
// ============================================================================
import type { SideQuestStep } from '../types';

/** One landing of the Midnight Deep (floors 1–9: reach the hidden sigil). */
const deepFloor = (n: number, name: string): SideQuestStep => ({
  id: `sq_deep${n}`, quest: 'deep', at: 'wargill',
  needs: [n === 1 ? 'sq_deep_open' : `sq_deep${n - 1}`], chapterMin: 4,
  pre: `sq_deep${n}_pre`, battle: `b_deep${n}`,
  flags: [`sq_deep${n}`],
  objective: `The Midnight Deep — descend to ${name}, landing ${n} of 10.`,
});

export const side: SideQuestStep[] = [
  // ==========================================================================
  //  The Ghost of the Colliery (Chapter III+): Beorn & Rhosyn
  // ==========================================================================
  {
    id: 'sq_colliery_bastian', quest: 'colliery', at: 'cogsgard', needs: ['ch3_lesandre_done'], chapterMin: 3, needChar: ['mattis'],
    pre: 'sq_col_bastian', flags: ['sq_colliery_bastian'],
    objective: 'Bastian Brunel has written to Mattis from Cogsgard. "Urgent," underlined four times.',
  },
  {
    id: 'sq_colliery_rumor', quest: 'colliery', at: 'colgrave', needs: ['sq_colliery_bastian'], chapterMin: 3,
    pre: 'sq_col_rumor', flags: ['sq_colliery_rumor'],
    objective: 'Ask after the Ghost of the Colliery in the taverns of Colgrave.',
  },
  {
    id: 'sq_colliery_hunter', quest: 'colliery', at: 'lesandre', needs: ['sq_colliery_rumor'], chapterMin: 3,
    pre: 'sq_col_hunter', flags: ['sq_colliery_hunter'],
    objective: 'A Temple Knight in Lesandre is asking after the colliery ghost.',
  },
  {
    id: 'sq_colliery_f1', quest: 'colliery', at: 'colgrave', needs: ['sq_colliery_hunter'], chapterMin: 3,
    pre: 'sq_col1_pre', battle: 'b_colliery1', post: 'sq_col1_post', flags: ['sq_colliery1'],
    objective: 'Descend into the Colgrave colliery with Beorn: the Pithead Gallery.',
  },
  {
    id: 'sq_colliery_f2', quest: 'colliery', at: 'colgrave', needs: ['sq_colliery1'], chapterMin: 3,
    pre: 'sq_col2_pre', battle: 'b_colliery2', post: 'sq_col2_post', flags: ['sq_colliery2'],
    objective: 'Deeper into the colliery: the Second Seam.',
  },
  {
    id: 'sq_colliery_f3', quest: 'colliery', at: 'colgrave', needs: ['sq_colliery2'], chapterMin: 3,
    pre: 'sq_col3_pre', battle: 'b_colliery3', post: 'sq_col3_post', flags: ['sq_colliery3'],
    objective: 'Deeper still: the Drowned Gallery.',
  },
  {
    id: 'sq_colliery_f4', quest: 'colliery', at: 'colgrave', needs: ['sq_colliery3'], chapterMin: 3,
    pre: 'sq_col4_pre', battle: 'b_colliery4', post: 'sq_col4_post', flags: ['sq_colliery'],
    objective: 'The bottom of the colliery: the Wyrm\'s Hollow, and Vorgund Hask.',
  },

  // ==========================================================================
  //  Octo — Automaton VIII
  // ==========================================================================
  {
    id: 'sq_octo', quest: 'octo', at: 'cogsgard', needs: ['sq_colliery'], chapterMin: 3, needChar: ['mattis'],
    pre: 'sq_octo', flags: ['sq_octo'],
    objective: 'Return to the Brunel workshop in Cogsgard. The Eighth is still waiting.',
  },

  // ==========================================================================
  //  Nevel Temple (Chapter IV): Rhosyn's curse
  // ==========================================================================
  {
    id: 'sq_nevel_rumor', quest: 'nevel', at: 'zeltmoor', needs: ['sq_octo', 'ch4_germain_done'], chapterMin: 4, needChar: ['beorn', 'rhosyn'],
    pre: 'sq_nevel_rumor', flags: ['sq_nevel_rumor'], unlock: ['nevel'],
    objective: 'Pilgrims in Zeltmoor\'s taverns speak of a cursed isle beyond Mount Bervaine.',
  },
  {
    id: 'sq_nevel', quest: 'nevel', at: 'nevel', needs: ['sq_nevel_rumor'], chapterMin: 4, needChar: ['beorn', 'rhosyn'],
    pre: 'sq_nevel_pre', battle: 'b_nevel', post: 'sq_nevel_post', flags: ['sq_nevel'],
    objective: 'Cross the frozen lake to Nevel Temple, and seek a cure for Rhosyn\'s curse.',
  },

  // ==========================================================================
  //  A Flower for a Stranger (Chapter IV): Aline & Kestrel
  // ==========================================================================
  {
    id: 'sq_flower_offer', quest: 'flower', at: 'zargid', needs: ['ch4_germain_done'], chapterMin: 4,
    pre: 'sq_flower_offer', flags: ['sq_flower_offered'],
    objective: 'A flower girl calls out to passers-by in the market of Zargid.',
  },
  {
    id: 'sq_flower_again', quest: 'flower', at: 'zargid', needs: ['sq_flower_declined'], chapterMin: 4,
    pre: 'sq_flower_again', flags: [], repeat: true,
    objective: 'Aline still sells her flowers in Zargid, for a single gil.',
  },
  {
    id: 'sq_kestrel_arrival', quest: 'kestrel', at: 'cogsgard', needs: ['sq_flower'], chapterMin: 4,
    pre: 'sq_kestrel_arrival', flags: ['sq_kestrel_arrived'],
    objective: 'Bastian Brunel has unearthed another marvel in Cogsgard.',
  },
  {
    id: 'sq_kestrel', quest: 'kestrel', at: 'zargid', needs: ['sq_kestrel_arrived'], chapterMin: 4,
    pre: 'sq_kestrel_pre', battle: 'b_zargid_kestrel', post: 'sq_kestrel_post', flags: ['sq_kestrel'],
    objective: 'Find the stranger who fell out of Bastian\'s machine. He was bound for Zargid.',
  },

  // ==========================================================================
  //  The Midnight Deep (after the Great Chapel of Murondel): Ophion, Grimwald
  // ==========================================================================
  {
    id: 'sq_deep_open', quest: 'deep', at: 'wargill', needs: ['b_murondel3'], chapterMin: 4,
    pre: 'sq_deep_open', flags: ['sq_deep_open'],
    objective: 'The harbourmaster of Wargill Port has troubling news of the old quay.',
  },
  deepFloor(1, 'Nywlag'),
  deepFloor(2, 'Aranel'),
  deepFloor(3, 'Eladray'),
  deepFloor(4, 'Lehteb'),
  deepFloor(5, 'Lekriz'),
  deepFloor(6, 'Digraz'),
  deepFloor(7, 'Sidlavi'),
  deepFloor(8, 'Lligraw'),
  deepFloor(9, 'Nerua'),
  {
    id: 'sq_deep10', quest: 'deep', at: 'wargill', needs: ['sq_deep9'], chapterMin: 4,
    pre: 'sq_deep10_pre', battle: 'b_deep10', post: 'sq_deep10_post',
    flags: ['sq_deep10', 'sq_deep', 'learn_twelvefold'],
    objective: 'The Midnight Deep — the last landing: END.',
  },

  // ==========================================================================
  //  Rare battles (Chapter IV)
  // ==========================================================================
  {
    id: 'sq_rare_monks', quest: 'rare', at: 'grogmoor', needs: [], chapterMin: 4, repeat: false,
    pre: 'sq_monks_pre', battle: 'b_rare_monks', post: 'sq_monks_post', flags: ['sq_rare_monks'],
    objective: 'Rare battle: eleven monks bar the drovers\' road on Grogmoor Hill.',
  },
  {
    id: 'sq_rare_beasts', quest: 'rare', at: 'barrowhill', needs: [], chapterMin: 4, repeat: false,
    pre: 'sq_beasts_pre', battle: 'b_rare_beasts', post: 'sq_beasts_post', flags: ['sq_rare_beasts'],
    objective: 'Rare battle: the burial mounds of Barrow Hill have opened.',
  },
];
