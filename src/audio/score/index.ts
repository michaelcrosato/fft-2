// Every music cue the game plays, by id.
import type { Song } from './dsl';
import { battle1, battle2, battle3, boss, finalBoss, umbral } from './battle';
import { church, defeat, dungeon, heroic, romance, somber, tension, victory } from './moods';
import { chapter, credits, ending, prologue, title } from './story';
import { campfire, formation, tavern, town, worldmap } from './world';

export const MUSIC: Record<string, Song> = Object.fromEntries(
  [title, prologue, worldmap, town, tavern, battle1, battle2, battle3, boss, umbral, finalBoss, victory, defeat, somber, tension, church, heroic, romance, campfire, dungeon, ending, credits, chapter, formation].map((s) => [s.id, s]),
);
