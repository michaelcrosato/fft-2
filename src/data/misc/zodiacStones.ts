// The Zodiac Stones as the company comes to hold them (shown in the Chronicle).
// Each stone is "held" once its flag is set — a story flag, or the id of the battle where it was won.
import type { Zodiac } from '../types';

export interface ZodiacStoneDef { sign: Zodiac; flag: string; where: string; lore: string }

export const ZODIAC_STONES: ZodiacStoneDef[] = [
  { sign: 'aries', flag: 'b_beleth', where: 'The throne hall of Riverain Castle, after Beleth fell', lore: 'Red as a forge-coal and warm to the touch long after the Ram was unmade. Wolfram\'s grief is still in it, somewhere.' },
  { sign: 'taurus', flag: 'has_taurus_stone', where: 'The Nine-Gear Yard, Cogsgard', lore: 'The stone Bastian Brunel dug out of the old workings. It hums when set near clockwork, as if it remembers engines older than Ivaldis.' },
  { sign: 'gemini', flag: 'b_zepar', where: 'The chapel of Limbourne, wrested from Zepar', lore: 'A stone that is two stones: turn it in the light and a second facet looks back at you with someone else\'s eyes.' },
  { sign: 'cancer', flag: 'b_murondel3', where: 'The great chapel of Murondel', lore: 'Cold and nacreous, like the inside of a shell. The brothers of Murondel kept it in a font of salt water for three hundred years.' },
  { sign: 'leo', flag: 'b_astaroth', where: 'The Airship Graveyard, taken from Astaroth', lore: 'Gold shot through with a vein of crimson. It is heavy far beyond its size, and it will not lie still on a table.' },
  { sign: 'virgo', flag: 'b_altessa', where: 'The last sky-ship, after the Crimson Seraph', lore: 'The saint\'s own stone, once carried in procession every Sanctumday. Now it is only a stone, and Alys is only a girl, and both are free.' },
  { sign: 'libra', flag: 'b_necropolis', where: 'The Necropolis beneath Murondel', lore: 'Perfectly balanced on any edge you set it. Scholars say it weighed souls; Malik says it weighed tithes.' },
  { sign: 'scorpio', flag: 'has_scorpio_stone', where: 'The chapel of Castle Lyonesse, after Vepar', lore: 'Black glass with a hook of light caught inside. It was the first stone Rhen held, and the first to show him what the stones are.' },
  { sign: 'sagittarius', flag: 'b_limbourne_elmond', where: 'Limbourne Castle, from the Marquis Elmond', lore: 'The Marquis wore it on a chain for sixty years and never aged a day. It is a little dimmer now.' },
  { sign: 'capricorn', flag: 'b_ygress', where: 'Castle Ygress, from Azazel', lore: 'Dorian meant to crown himself with it. It sits in a pouch now, between a whetstone and a heel of bread.' },
  { sign: 'aquarius', flag: 'b_lostsanctum', where: 'The Lost Sanctum', lore: 'Pale blue and always faintly damp. Pour water over it and the water runs uphill for a heartbeat.' },
  { sign: 'pisces', flag: 'b_riverain_roof', where: 'The rooftops of Riverain', lore: 'The stone that breathed life back into Malik. Two fish chase one another beneath its surface and never meet.' },
  { sign: 'serpentarius', flag: 'b_deep10', where: 'The bottom of the Midnight Deep', lore: 'The thirteenth stone, the one the Church struck from its calendars. It is warm, and it is patient, and it is listening.' },
];
