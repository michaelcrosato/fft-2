// ============================================================================
//  Story steps — Prologue and Chapter I "The Low-Born", in play order.
//  The game starts at the first step (no `at` → runs immediately). After the
//  prologue the tale flashes back a year: Galwyn, the deathbed at Ygress, and
//  the long road north to Fort Ziekhold.
//
//  Flags set here that later chapters may read:
//    prologue_done, ch1_save_argan | ch1_rout_brigade (Mandrel choice),
//    ch1_baldric_charge, ch1_defied_dorian, ch1_marquis_rescued,
//    ch1_gustin_executed, ch1_ransom_plot, ch1_mirelle_escaped,
//    ch1_tessa_taken, ch1_argan_dismissed, ch1_mirelle_dead, ch1_campfire,
//    ch1_bocco_seen (Wolfram's kwehbo at Fovain), ch1_wolfram_vow,
//    ch1_argan_dead, ch1_tessa_dead, ch1_delan_lost, ch1_rhen_renounced, ch1_done
//  (plus every battle id, which the engine sets on victory).
// ============================================================================
import type { StoryStep } from '../types';

export const story: StoryStep[] = [
  // ---------------------------------------------------------------- Prologue
  {
    id: 'pro_intro', chapter: 0,
    pre: 'sc_pro_alazar',
    objective: 'Hear the tale the Church burned.',
    tier: 1,
    chain: true,
  },
  {
    id: 'pro_orvelle', chapter: 0,
    pre: 'sc_pro_orvelle_pre', battle: 'b_orvelle', post: 'sc_pro_orvelle_post',
    objective: 'Defend Princess Oriane at Orvelle Abbey.',
    flags: ['prologue_done'],
    moveTo: 'galwyn',
    chain: true,
  },

  // ---------------------------------------------------------------- Chapter I
  {
    id: 'ch1_galwyn', chapter: 1,
    pre: 'sc_galwyn_pre', battle: 'b_galwyn', post: 'sc_galwyn_post',
    objective: 'Drive the brigands from Galwyn\'s canal market.',
    unlock: ['galwyn'],
    chain: true,
  },
  {
    id: 'ch1_baldric', chapter: 1,
    pre: 'sc_baldric_flashback',
    objective: 'Remember the winter at Ygress.',
    flags: ['ch1_baldric_charge'],
    unlock: ['mandrel'],
  },
  {
    id: 'ch1_mandrel', chapter: 1, at: 'mandrel',
    pre: 'sc_mandrel_pre', battle: 'b_mandrel', post: 'sc_mandrel_post',
    objective: 'Cross the Mandrel Plains on the road home to Castle Ygress.',
    unlock: ['ygress'],
  },
  {
    id: 'ch1_ygress_plea', chapter: 1, at: 'ygress',
    pre: 'sc_ygress_plea',
    objective: 'Bring Argan to Castle Ygress to plead for his lord.',
    flags: ['ch1_defied_dorian'],
    unlock: ['swiggle'],
  },
  {
    id: 'ch1_swiggle', chapter: 1, at: 'swiggle',
    pre: 'sc_swiggle_pre', battle: 'b_swiggle', post: 'sc_swiggle_post',
    objective: 'Slip through Swiggle Woods toward Dorhaven.',
    unlock: ['dorhaven'],
  },
  {
    id: 'ch1_dorhaven', chapter: 1, at: 'dorhaven',
    pre: 'sc_dorhaven_pre', battle: 'b_dorhaven', post: 'sc_dorhaven_post',
    objective: 'Search Dorhaven for the Marquis\'s captors.',
    unlock: ['sandrat'],
  },
  {
    id: 'ch1_sandrat', chapter: 1, at: 'sandrat',
    pre: 'sc_sandrat_pre', battle: 'b_sandrat', post: 'sc_sandrat_post',
    objective: 'Rescue the Marquis of Limbourne from Sandrat Cellar.',
    flags: ['ch1_marquis_rescued', 'ch1_gustin_executed'],
  },
  {
    id: 'ch1_ygress_return', chapter: 1, at: 'ygress',
    pre: 'sc_ygress_laurent', post: 'sc_ransom_plot',
    objective: 'Return to Castle Ygress and answer for your disobedience.',
    flags: ['ch1_ransom_plot'],
    tier: 2,
    unlock: ['zekla', 'thieveskeep'],
  },
  {
    id: 'ch1_thieveskeep', chapter: 1, at: 'thieveskeep',
    pre: 'sc_thieveskeep_pre', battle: 'b_thieveskeep', post: 'sc_thieveskeep_post',
    objective: 'Storm the Ashen Brigade\'s stronghold at Thieves\' Keep.',
    flags: ['ch1_mirelle_escaped'],
    unlock: ['lenara'],
  },
  {
    id: 'ch1_tessa_taken', chapter: 1, at: 'ygress',
    pre: 'sc_tessa_taken',
    objective: 'Report to Castle Ygress.',
    flags: ['ch1_tessa_taken', 'ch1_argan_dismissed'],
  },
  {
    id: 'ch1_lenara', chapter: 1, at: 'lenara',
    pre: 'sc_lenara_pre', battle: 'b_lenara', post: 'sc_lenara_post',
    objective: 'Pursue Tessa\'s captors onto the Lenara Plateau.',
    flags: ['ch1_mirelle_dead'],
    chain: true,
  },
  {
    id: 'ch1_campfire', chapter: 1,
    pre: 'sc_campfire',
    objective: 'Make camp beneath the stars.',
    flags: ['ch1_campfire'],
    unlock: ['fovain'],
  },
  {
    id: 'ch1_fovain', chapter: 1, at: 'fovain',
    pre: 'sc_fovain_pre', battle: 'b_fovain', post: 'sc_fovain_post',
    objective: 'Press north to Fovain Mill on Tessa\'s trail.',
    flags: ['ch1_bocco_seen', 'ch1_wolfram_vow'],
    unlock: ['ziekhold'],
  },
  {
    id: 'ch1_ziekhold', chapter: 1, at: 'ziekhold',
    pre: 'sc_ziekhold_pre', battle: 'b_ziekhold', post: 'sc_ziekhold_post',
    objective: 'Reach Fort Ziekhold before the Northsky does.',
    flags: ['ch1_argan_dead', 'ch1_tessa_dead', 'ch1_delan_lost'],
    chain: true,
  },
  {
    id: 'ch1_end', chapter: 1,
    pre: 'sc_rhen_renounces',
    objective: 'Walk away.',
    flags: ['ch1_rhen_renounced', 'ch1_done'],
    moveTo: 'orvelle',
  },
];
