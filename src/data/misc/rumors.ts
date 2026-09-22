// ============================================================================
//  Tavern rumours. Shown in the tavern menu of any listed town while the
//  chapter window fits and every `needs` flag is set (battle ids are set as
//  flags when won). Political gossip, legends, Church whispers, monster
//  sightings, local colour — and hints toward the side quests.
//  All text original.
// ============================================================================

export interface Rumor {
  id: string;
  title: string;
  text: string;
  towns: string[];
  chapterMin: number;
  chapterMax?: number;
  needs?: string[];
}

/** Every town with a tavern. */
const ALL = ['galwyn', 'ygress', 'dorhaven', 'yardale', 'lesandre', 'colgrave', 'bervaine', 'zeltmoor', 'zargid', 'zelland', 'lyonesse', 'cogsgard', 'wargill'];

export const rumors: Rumor[] = [
  // ==========================================================================
  //  Legends and the Church (any chapter)
  // ==========================================================================
  {
    id: 'r_twelve_braves', title: 'The Twelve Braves', towns: ALL, chapterMin: 1,
    text: 'In the age of Saint Auren, when the dark came up out of the earth, twelve heroes each took up a Zodiac Stone and drove it back. The Church names them the Twelve Braves and keeps their feast in midwinter. Ask a priest their names and he will give you twelve. Ask two priests and you will get fifteen.',
  },
  {
    id: 'r_zodiac_stones', title: 'The Zodiac Stones', towns: ['galwyn', 'lesandre', 'bervaine', 'zeltmoor', 'lyonesse'], chapterMin: 1,
    text: 'The Glorian Church holds that the twelve Zodiac Stones are holy relics, gifts of the Braves, and that the faithful who look upon one are forgiven a year of sins. Only three are said to rest in the Church\'s keeping. Where the other nine are, the Church does not like to be asked.',
  },
  {
    id: 'r_auren_germaine', title: 'Saint Auren and the Betrayer', towns: ['lesandre', 'lyonesse', 'bervaine', 'yardale'], chapterMin: 1,
    text: 'Every child in Ivaldis knows that Saint Auren was betrayed to his death by his disciple Germaine, who sold him for a purse of silver. What the children are not taught is that the Church burned every book Germaine ever wrote. A curious thing to do to a man who wrote nothing worth reading.',
  },
  {
    id: 'r_kwehbos', title: 'Wild Kwehbos', towns: ['galwyn', 'ygress', 'dorhaven'], chapterMin: 1,
    text: 'The herders on the Mandrel Plains swear a black kwehbo was seen running with the wild flocks last spring — the kind that can clear a barn roof at a single bound. A red one has been sighted in the north as well, and the man who saw it now walks with a stick.',
  },
  {
    id: 'r_mandrel_stones', title: 'The Standing Stones of Mandrel', towns: ['galwyn', 'ygress'], chapterMin: 1,
    text: 'Nobody knows who raised the standing stones on the Mandrel Plains. The Academy says the ancients; the shepherds say giants; the Church says nothing at all. On midsummer night, they say, the stones cast shadows with no moon to cast them.',
  },
  {
    id: 'r_lost_age', title: 'Relics of the Lost Age', towns: ['cogsgard', 'zelland', 'dorhaven', 'wargill'], chapterMin: 1,
    text: 'Before the Church, before the Braves, there was an age of iron ships that sailed the air and engines that thought for themselves. It ended in fire. The artificers of Cogsgard dig its bones out of the earth and sell them by the pound, and the Church pretends not to notice so long as the tithes are paid.',
  },

  // ==========================================================================
  //  Chapter I — the year after the Fifty Winters' War
  // ==========================================================================
  {
    id: 'r_fifty_winters', title: 'The Fifty Winters\' War', towns: ['galwyn', 'ygress', 'dorhaven'], chapterMin: 1, chapterMax: 2,
    text: 'The war with Ormandy ended last year after fifty winters of it, not with a victory but with a signature. The nobles came home to feasts. The common soldiers came home to find their pay was a promissory note, their farms were sold, and their names were on no one\'s list.',
  },
  {
    id: 'r_ashen_brigade', title: 'The Ashen Brigade', towns: ['galwyn', 'ygress', 'dorhaven'], chapterMin: 1, chapterMax: 1,
    text: 'The Ashen Brigade were volunteers in the war — farmers\' sons, mostly, who fought for the crown when it asked. Now the crown will not feed them, so they raid its granaries instead. Half the villages between here and Fovain curse them. The other half leave a door unbarred at night.',
  },
  {
    id: 'r_king_ondrel', title: 'The King\'s Health', towns: ['ygress', 'dorhaven', 'lesandre', 'galwyn'], chapterMin: 1, chapterMax: 2,
    text: 'King Ondrel has not left his bed since the autumn. The physicians bleed him every morning and the bishops pray over him every evening, and between the two of them he grows thinner by the week. In the palace, they say, the Queen\'s brother and the Duke of Zeltmoor no longer bother to greet one another in the halls.',
  },
  {
    id: 'r_galwyn_academy', title: 'Academy Gossip', towns: ['galwyn'], chapterMin: 1, chapterMax: 1,
    text: 'A lecturer at the Academy tried to teach a class of cadets to call thunder, and now the bell-tower hums whenever it rains. The cadets think it is the finest thing that has ever happened. The bell-ringer has taken to wearing wool in his ears.',
  },
  {
    id: 'r_marquis_taken', title: 'The Marquis Taken', towns: ['galwyn', 'ygress', 'dorhaven'], chapterMin: 1, chapterMax: 1, needs: ['b_galwyn'],
    text: 'The Marquis of Limbourne has been carried off by the Ashen Brigade on the road north, for all his guards and his fine coach. A ransom has been named. It is a very great deal of money — enough, some say, that it is odd how quietly the Northsky lords are taking the news.',
  },
  {
    id: 'r_sandrat_smugglers', title: 'Beneath Dorhaven', towns: ['dorhaven'], chapterMin: 1, chapterMax: 2,
    text: 'Under the southern quarter of Dorhaven lie the Sandrat Cellars, dug for bonded wine two hundred years ago. Nothing that goes in or out of them has paid a toll since. Ask a watchman about the cellars and he will tell you they are flooded. Ask him why his boots are dry, and he will stop talking to you.',
  },
  {
    id: 'r_fovain_mill', title: 'The Miller of Fovain', towns: ['ygress', 'galwyn'], chapterMin: 1, chapterMax: 2,
    text: 'The great windmill on the Fovain plain still turns, though the miller has been dead ten years. His widow says it grinds on moonless nights with no one at the stones, and that the flour it makes is black. She sells it anyway. It makes a very fine rye.',
  },
  {
    id: 'r_ziekhold_powder', title: 'The Stores of Fort Ziekhold', towns: ['ygress'], chapterMin: 1, chapterMax: 1,
    text: 'Fort Ziekhold was built against an Ormandy invasion that never came, and its cellars are still packed to the rafters with black powder no one ever fired. The garrison has orders to hold. The garrison has had the same orders for thirty years, and some of them are getting nervous about the powder.',
  },

  // ==========================================================================
  //  Chapter II — pawn and player
  // ==========================================================================
  {
    id: 'r_princess_taken', title: 'The Princess Abducted', towns: ['dorhaven', 'zelland', 'lyonesse', 'cogsgard', 'wargill'], chapterMin: 2, chapterMax: 2,
    text: 'Princess Oriane has been stolen from Orvelle Abbey by riders in the Black Lion\'s colours — or so the criers in Lesandre say. The Black Lion\'s men say they have never heard of it, and that the White Lion has a great deal to gain from her disappearance. Both sides are searching for her. Neither seems in any hurry to find her alive.',
  },
  {
    id: 'r_baird_company', title: 'The Baird Trading Company', towns: ['zelland', 'cogsgard', 'dorhaven', 'wargill'], chapterMin: 2, chapterMax: 3,
    text: 'There is nothing in the south the Baird Trading Company will not buy, sell or hire out — ships, grain, watchmen, magistrates. Old Ludo Baird has been asking after Lost Age relics lately, and paying well. Anyone who has refused to sell to him has had a run of very bad luck.',
  },
  {
    id: 'r_cardinal_dracomir', title: 'The Cardinal of Lyonesse', towns: ['lyonesse', 'zelland', 'wargill'], chapterMin: 2, chapterMax: 2,
    text: 'Cardinal Dracomir feeds five hundred poor at his gate every holy day, and his chapel is richer than most cathedrals. He rules Lyonesse in the Church\'s name, with no lord above him. The fishwives adore him. The men who have been taken into his dungeons are, as a rule, no longer available for comment.',
  },
  {
    id: 'r_two_lions', title: 'The White Lion and the Black', towns: ['lesandre', 'dorhaven', 'zelland', 'lyonesse', 'yardale', 'ygress'], chapterMin: 2, chapterMax: 2,
    text: 'The infant Prince Orin is the King\'s son and heir, and his mother means his uncle, Duke Laurent — the White Lion — to rule for him. Duke Galtran, the Black Lion, means otherwise. When the King dies, one lion will be regent and the other will be a traitor. It only remains to see which is which.',
  },
  {
    id: 'r_queen_brother', title: 'The Queen\'s Brother', towns: ['lesandre', 'ygress'], chapterMin: 2, chapterMax: 2,
    text: 'Queen Louvaine and Duke Laurent are brother and sister, and closer than either is to the King. It is said at court that the Queen chooses her son\'s tutors, her brother chooses his generals, and between them they have not left the Black Lion a single chair to sit on.',
  },
  {
    id: 'r_zigor_guides', title: 'Crossing Zigor Fen', towns: ['lyonesse', 'cogsgard'], chapterMin: 2,
    text: 'If you must cross Zigor Fen, hire a guide, and pay him half before and half after. Pay him the whole sum before, and he may decide the fen is too dangerous this season. Pay him nothing before, and you may find the fen deeper than you were told.',
  },
  {
    id: 'r_barrow_kings', title: 'The Barrow Kings', towns: ['zelland', 'lyonesse'], chapterMin: 2,
    text: 'The mounds on Barrow Hill are the graves of kings who ruled before the Church came, buried with their horses, their hounds and their treasure. Nobody robs them. The last man who tried came down the hill at dawn with his hair gone white, and has not said a word in forty years.',
  },
  {
    id: 'r_cogsgard_relics', title: 'Machines That Dream', towns: ['cogsgard', 'zelland'], chapterMin: 2,
    text: 'Old Bastian Brunel, the master artificer, swears the machines he digs out from under Cogsgard are not dead but sleeping. Last winter, they say, one of them walked three steps across his workshop before it fell down again. His neighbours say he had been drinking. His neighbours were also drinking.',
  },
  {
    id: 'r_zekla_ruins', title: 'What the Sand Uncovers', towns: ['dorhaven'], chapterMin: 2,
    text: 'Every night the wind rearranges the Zekla Dunes, and every morning the scavengers go out to see what it has uncovered: bones, blades, now and then the roof of a Lost Age tower. One found a brass door last month with a keyhole shaped like a star. He is still looking for the key.',
  },
  {
    id: 'r_wargill_stair', title: 'The Sealed Stair', towns: ['wargill'], chapterMin: 2, chapterMax: 4,
    text: 'No captain in Wargill will moor his ship above the old quay. Under it, the dockers say, there is a stair the Church sealed a hundred years ago, and on still nights you can hear something on the other side of the iron, counting. The harbourmaster says that is nonsense. The harbourmaster also moors his own boat at the far end of the harbour.',
  },
  {
    id: 'r_ormandy_ships', title: 'Ships from Ormandy', towns: ['wargill', 'zelland'], chapterMin: 2,
    text: 'The first merchantmen out of Ormandy since the peace have come into Wargill, and the harbour folk turned out to stare at their old enemies. Ormandy sailors, it turns out, have two arms and two legs, drink too much and cheat at dice. The dockers were very disappointed.',
  },

  // ==========================================================================
  //  Chapter III — the brave and the damned
  // ==========================================================================
  {
    id: 'r_pride_war', title: 'The Pride War', towns: ALL, chapterMin: 3, chapterMax: 3,
    text: 'King Ondrel is dead, and the kingdom has two regents, two heirs and two armies. The White Lion holds the capital and the infant prince; the Black Lion holds the princess and the east. The broadsheets call it the Pride War. The farmers whose fields both armies march across call it other things.',
  },
  {
    id: 'r_cardinal_martyr', title: 'A Martyr at Lyonesse', towns: ['lyonesse', 'lesandre', 'zelland', 'bervaine'], chapterMin: 3, needs: ['b_vepar'],
    text: 'Cardinal Dracomir is dead, murdered in his own chapel by a heretic, and the Church has declared him a martyr. The servants who ran from the chapel that night tell a different tale, of a shape that was not a man. They told it once. They have not been seen since.',
  },
  {
    id: 'r_heretic_valorne', title: 'The Heretic of Lesandre', towns: ['lesandre', 'colgrave', 'yardale', 'dorhaven', 'galwyn'], chapterMin: 3, needs: ['b_lesandre'],
    text: 'The Inquisitor has named a heretic in Lesandre — a young swordsman, noble-born by some accounts, a murderer of Cardinals by all of them. There is a price on his head that would buy a farm. They say he is seven feet tall, has a demon for a sister, and never sleeps. A description has been posted. It is not very good.',
  },
  {
    id: 'r_colliery_ghost', title: 'The Ghost of the Colliery', towns: ['colgrave', 'lesandre', 'cogsgard'], chapterMin: 3, needs: ['sq_colliery_bastian'],
    text: 'Colgrave\'s colliers will not go down the deep seams. Something walks there — white as bone, winged like a church\'s sails — and at night a woman\'s voice keens up through the shafts. Six men have vanished since the equinox. The pit-master has posted a bounty, and the whole town is waiting to see who is fool enough to claim it.',
  },
  {
    id: 'r_hunter_lesandre', title: 'A Knight Who Hunts Heretics', towns: ['lesandre'], chapterMin: 3, needs: ['sq_colliery_rumor'],
    text: 'There is a Temple Knight drinking by the north gate who pays for news of the Colgrave ghost with good silver. He hunts heretics for bounty, they say, and has dragged a score of them before the Inquisition. Strange, then, how gently he speaks when he asks about the woman\'s voice in the shafts.',
  },
  {
    id: 'r_colgrave_horns', title: 'Colgrave\'s Horns', towns: ['colgrave'], chapterMin: 3,
    text: 'The colliery horns sound at every change of shift, day and night, and a Colgrave child learns to sleep through them before it learns to walk. Now both Lions want coal for their forges, and the pit-masters have added a fourth shift. The horns sound so often that the colliers have stopped hearing them — which is bad, because the horns also sound for fire.',
  },
  {
    id: 'r_thunder_saint', title: 'The Thunder Saint', towns: ['zeltmoor', 'bervaine', 'yardale', 'lesandre', 'zargid'], chapterMin: 3, chapterMax: 4,
    text: 'Count Cedric Orland, the Thunder Saint, held the bridge at Carrow against an Ormandy army for three days with forty men, and they say lightning fell wherever he pointed his sword. He is the Black Lion\'s greatest general. He is also, they whisper, the only man in Zeltmoor who does not want this war.',
  },
  {
    id: 'r_riverain_duke', title: 'The Grand Duke of Riverain', towns: ['yardale', 'lesandre'], chapterMin: 3, chapterMax: 3,
    text: 'Grand Duke Barrington keeps a fine table, a fine library and a household of orphans he has raised himself, out of the goodness of his heart. The orphans are very well trained. Most of the people who have crossed the Grand Duke have died in their beds, of nothing anyone could name.',
  },
  {
    id: 'r_ageless_marquis', title: 'The Ageless Marquis', towns: ['yardale', 'zargid', 'zeltmoor', 'bervaine'], chapterMin: 3,
    text: 'The Marquis of Limbourne has ruled his lake castle for forty years, and in all that time he has not grown a single grey hair. His handmaidens do not age either. The fishermen of Limbourne will tell you he bathes in the lake by moonlight. They will not tell you what the lake looks like afterwards.',
  },
  {
    id: 'r_sanctum_whispers', title: 'Knights Without a Banner', towns: ['lesandre', 'yardale', 'bervaine', 'lyonesse'], chapterMin: 3,
    text: 'There are knights who serve the Church and wear no order\'s colours — white cloaks, red crosses, and no names that anyone will speak aloud. When a bishop becomes inconvenient, he falls from a tower. When a heretic becomes popular, he simply stops being anywhere. Nobody sees the knights. Everybody knows they are there.',
  },
  {
    id: 'r_bervaine_free', title: 'The Free City', towns: ['bervaine', 'zeltmoor', 'yardale'], chapterMin: 3,
    text: 'Bervaine bows to no duke and pays neither Lion a single gil, which makes it the only city in Ivaldis where both sides can meet to spy on one another. Its guildmasters are growing very rich on the war, and very nervous about what will happen when it ends.',
  },
  {
    id: 'r_airship_graveyard', title: 'Hulls on the Cliffs', towns: ['galwyn', 'dorhaven', 'yardale'], chapterMin: 3,
    text: 'North of Murondel, on the cliffs, lie the rusted hulls of ships that once sailed the air. Pilgrims to the Holy See are told they are the wrecks of the Betrayer\'s fleet, struck down by Saint Auren\'s wrath. The artificers of Cogsgard say the ships are a thousand years older than the saint. The artificers are not invited to Murondel.',
  },
  {
    id: 'r_yewgrove_dead', title: 'The Yews of Yewgrove', towns: ['yardale'], chapterMin: 3,
    text: 'Someone has been paying gravediggers to open the old barrows under the yews north of Yardale — good money, and no questions. The gravediggers have stopped taking the work. The graves they opened are empty now, and the dead that were in them have been seen walking the Riverain road.',
  },

  // ==========================================================================
  //  Chapter IV — for whom the crown
  // ==========================================================================
  {
    id: 'r_bethel_sluice', title: 'The Sluices of Bethel', towns: ['zeltmoor', 'zargid', 'lesandre', 'bervaine'], chapterMin: 4, chapterMax: 4,
    text: 'Both Lions have marched on Bethel Garrison, the fortress that holds the south. Whoever holds its sluice-gates can drown the plain below it and every army camped there. The old engineers who built the sluices are all dead, and nobody left alive quite remembers which lever does what.',
  },
  {
    id: 'r_lions_dead', title: 'Both Lions Dead', towns: ALL, chapterMin: 4, needs: ['b_bethel_sluice'],
    text: 'The White Lion is dead at Bethel, and the Black Lion with him — murdered, the heralds say, though they cannot agree by whom. The armies of both are now commanded by a young man of no family at all, who is said to have ended the war with a single stroke. The Church has blessed him already.',
  },
  {
    id: 'r_hero_bethel', title: 'The Hero of Bethel', towns: ['lesandre', 'zeltmoor', 'bervaine', 'zargid', 'yardale'], chapterMin: 4, needs: ['b_bethel_sluice'],
    text: 'Delan Harrow, they call him — a commoner raised in a noble house, who came out of nowhere to end the Pride War. The balladeers have eleven songs about him already, and not one agrees with another. The only thing everyone agrees on is that he will marry the princess, and that the Church will crown them both.',
  },
  {
    id: 'r_thunder_saint_fate', title: 'The Thunder Saint\'s Fate', towns: ['zeltmoor', 'zargid', 'bervaine'], chapterMin: 4, needs: ['b_bethel_sluice'],
    text: 'Count Orland, the Thunder Saint, has been put to death at Bethel for treason — or so the Church\'s heralds read out in every square. Oddly, no one seems to have seen the execution. Odder still, a soldier swears he saw the Count alive a week after, riding west with a band of heretics.',
  },
  {
    id: 'r_germain_shadows', title: 'Shadows on Germain Peak', towns: ['zargid', 'zeltmoor'], chapterMin: 4,
    text: 'The hermits on Germain Peak have come down the mountain, every one of them. Men in black have taken the high paths, they say, men who move without sound and leave no footprints in the snow. The Church insists the mountain is named for some other Germain entirely. The men in black do not seem to care.',
  },
  {
    id: 'r_poskar_bell', title: 'The Drowned Bell', towns: ['zargid'], chapterMin: 4,
    text: 'On windless nights you can hear the old church bell tolling at the bottom of Poskar Mere, where a village drowned a hundred years ago. Lately it has been tolling every night, wind or no wind. And lately the drowned have begun to answer it.',
  },
  {
    id: 'r_pontiff_silence', title: 'The Pontiff\'s Silence', towns: ['lesandre', 'bervaine', 'zeltmoor', 'yardale'], chapterMin: 4,
    text: 'Pontiff Marcellus has not been seen on his balcony at Murondel since the spring. His sermons are read out by other men now, and they are sterner than his ever were. The Holy See says the Pontiff is at prayer. The Holy See has said so for three months.',
  },
  {
    id: 'r_ygress_quarrel', title: 'Trouble at Ygress', towns: ['ygress', 'galwyn', 'dorhaven'], chapterMin: 4,
    text: 'The Valorne brothers are at each other\'s throats in their own castle. The Knight-Commander is said to have found some old letter of his father\'s and ridden home in a fury; the Lord of Ygress has doubled his guard. The servants have been sent away. The ones who stayed are packing.',
  },
  {
    id: 'r_nevel_isle', title: 'The Cursed Isle of Nevel', towns: ['zeltmoor', 'bervaine'], chapterMin: 4, needs: ['sq_octo'],
    text: 'Beyond Mount Bervaine lies a lake that froze a thousand years ago and never thawed, and in the middle of it the Isle of Nevel, with a temple older than the Church. The cursed go there to be made whole, pilgrims say. Its bronze doors open by themselves — and its guardians never sleep.',
  },
  {
    id: 'r_flower_girl', title: 'The Flower Girl of Zargid', towns: ['zargid', 'zeltmoor'], chapterMin: 4,
    text: 'There is a girl in the Zargid market who sells flowers for a single gil apiece, and talks to them while she does it. She says strange things about the sky, and stranger things about the people she sells to. The Brotherhood of the Scales has been leaning on her for market dues. She laughs at them. That is not a safe thing to do.',
  },
  {
    id: 'r_cogsgard_flash', title: 'Lightning Without a Cloud', towns: ['cogsgard', 'zargid', 'zelland'], chapterMin: 4, needs: ['sq_flower'],
    text: 'A flash of green lightning came out of Bastian Brunel\'s workshop in Cogsgard, on a clear day, and blew out every window on the street. A man was seen running from the smoke — a tall stranger with hair like a hedgehog and a sword the size of a door, asking everyone he met the way to "the flowers".',
  },
  {
    id: 'r_midnight_deep', title: 'The Midnight Deep', towns: ['wargill', 'zelland', 'lyonesse'], chapterMin: 4, needs: ['b_murondel3'],
    text: 'The iron doors under Wargill\'s old quay have swung open on their own, and the holy seals on them have turned black as tar. A stair goes down beneath the harbour, landing after landing, each with a name cut into the stone backwards. The dockers call it the Midnight Deep. No one who has gone down has come back up.',
  },
  {
    id: 'r_eleven_monks', title: 'The Eleven of Grogmoor', towns: ['dorhaven', 'lesandre', 'yardale'], chapterMin: 4,
    text: 'Eleven monks in grey have taken up the drovers\' road on Grogmoor Hill, and they will let no armed traveller pass without a bout of fists. They have beaten every soldier, sellsword and sheriff\'s man who has tried them. They are very polite about it, and they bind up your wounds afterwards.',
  },
  {
    id: 'r_beast_parade', title: 'Beasts on Barrow Hill', towns: ['zelland', 'lyonesse', 'wargill'], chapterMin: 4,
    text: 'The barrows on Barrow Hill have opened. Carters on the Lyonesse road swear they saw behemoths and dragons walking in procession across the downs at dusk, as solemn as a funeral — or a coronation. The Cardinal\'s old patrols would have gone to look. There are no patrols any more.',
  },
  {
    id: 'r_deep_treasure', title: 'Treasure in the Deep', towns: ['wargill', 'zargid'], chapterMin: 4, needs: ['sq_deep1'],
    text: 'Somebody has come back up out of the Midnight Deep after all — and with a relic blade on his back, too. There are treasures on every landing, he says, lying in the dust where the dead left them. You will not find them by looking, only by walking, and the lighter your heart, the richer the find.',
  },
  {
    id: 'r_crowned_commoner', title: 'A Commoner\'s Coronation', towns: ALL, chapterMin: 4, needs: ['b_murondel3'],
    text: 'The banns are posted in every church: Delan Harrow is to wed Princess Oriane, and the Holy See will crown them both at Lesandre. There will be three days of feasting and a free barrel in every square. The old soldiers of the Ashen Brigade are drinking to the groom. They are the only ones who remember what he used to say about crowns.',
  },
];
