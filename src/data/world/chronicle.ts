// ============================================================================
//  The Chronicle — "Events" entries, written in the voice of the historian
//  Alazar Durant, who pieced the true tale together from the Durant Papers
//  (the journals of his ancestor Oren Durant). Ids equal the battle ids of
//  DESIGN.md §2, or `ev_*` for turning points that are not battles.
//  Unlock with the scene command ['chronicle', id].
// ============================================================================
import type { ChronicleEvent } from '../types';

export const chronicle: ChronicleEvent[] = [
  // ==========================================================================
  //  PROLOGUE
  // ==========================================================================
  {
    id: 'ev_fifty_winters', chapter: 0, title: 'The Fifty Winters\' War',
    text: 'History remembers the Fifty Winters\' War as a victory, because the histories were written by those who did not fight it. Ivaldis sued Ormandy for peace on humiliating terms, King Ondrel lay dying, and the crown could not pay the soldiers who had bled for it. Those soldiers — hungry, unpaid and unthanked — took up arms again under the name of the Ashen Brigade. It was into this kingdom, poor and proud and quarrelling over a sickbed, that the events of my tale were born.',
  },
  {
    id: 'b_orvelle', chapter: 0, title: 'The Abduction at Orvelle Abbey',
    text: 'The official record states that Princess Oriane was carried off from Orvelle Abbey by Black Lion brigands, and rescued in due course by loyal men. The Durant Papers tell it otherwise. Her guardian Adria Oakhelm and a company of hired swords under the dark knight Garmond held the courtyard against the raiders — yet the princess was taken all the same, by a young man in a Northsky officer\'s coat riding a kwehbo. Among Garmond\'s mercenaries was a swordsman who knew that young man\'s face, and had believed him a year dead.',
  },

  // ==========================================================================
  //  CHAPTER I — The Low-Born
  // ==========================================================================
  {
    id: 'ev_baldric_death', chapter: 1, title: 'The Death of Lord Baldric',
    text: 'Lord Baldric Valorne, the Hero of the Fifty Winters, died at Castle Ygress of a wasting sickness his physicians could not name — or would not. To his eldest son Dorian he left the house, to Zander the army, and to his youngest, Rhen, a single charge: "Never shame your name; never suffer injustice." He also bade that the orphans Delan and Tessa Harrow be raised as members of the household. Of all his bequests, only the last was faithfully kept, and not by those who inherited his titles.',
  },
  {
    id: 'b_galwyn', chapter: 1, title: 'The Galwyn Market Raid',
    text: 'In the spring of that year a band of Ashen Brigade stragglers fell upon the market of Galwyn. The Academy\'s cadets, among them Rhen Valorne and his foster-brother Delan Harrow, drove them off before the city watch had finished buckling its boots. The Galwyn annals record the incident in a single line. I record it because it is the first time the two young men fought side by side, and the last time they did so without doubt.',
  },
  {
    id: 'b_mandrel', chapter: 1, title: 'The Mandrel Plains',
    text: 'On the Mandrel Plains the cadets came upon a lone noble cadet, Argan Vire, beset by Brigade soldiers. Having saved him, they learned that his lord, the Marquis Elmond of Limbourne, had been seized by the Brigade and was held for ransom. Argan spoke of commoners as a farmer speaks of weeds. It is a small mercy of history that no one then knew how many lives would turn upon that ungrateful boy.',
  },
  {
    id: 'b_swiggle', chapter: 1, title: 'The Road Through Swiggle Woods',
    text: 'Refused help by Lord Dorian, who claimed the house could spare no knights while Zander was away, Rhen and Delan resolved to rescue the Marquis themselves. Their road to Dorhaven led through Swiggle Woods, where goblins and worse had grown bold in the lawless years after the war. Of the skirmish itself little is recorded. That two boys should disobey their lord for the sake of a stranger was, however, remarked upon at Ygress for some time.',
  },
  {
    id: 'b_dorhaven', chapter: 1, title: 'Fighting in the Streets of Dorhaven',
    text: 'The Brigade\'s archers and hedge-wizards had made themselves at home in Dorhaven\'s back streets, sheltered by merchants who did not ask where their customers\' coin came from. The cadets fought them roof by roof and alley by alley. The Dorhaven council afterwards sent House Valorne a bill for broken tiles, which is preserved, unpaid, in the Ygress archive to this day.',
  },
  {
    id: 'b_sandrat', chapter: 1, title: 'The Sandrat Cellar',
    text: 'Beneath Dorhaven, in the smugglers\' vaults called Sandrat Cellar, the cadets found the Brigade\'s captive — and the Brigade\'s conscience. Wolfram Fell, once a holy knight of the war, arrived to find his officer Gustin Marr holding the Marquis for ransom, and executed him where he stood for shaming the Brigade\'s cause with common banditry. The Marquis was released unharmed. Wolfram left without a word to the Valorne boys, but the Papers say he looked long at Rhen before he went.',
  },
  {
    id: 'ev_ransom_plot', chapter: 1, title: 'The Price of a Marquis',
    text: 'At Ygress, Duke Laurent, the White Lion, praised young Rhen\'s courage before the whole court. What Rhen did not hear was the conversation afterwards, in Dorian\'s study. The Marquis\'s kidnapping had been arranged, and paid for, by Laurent and Dorian themselves: a pretext to brand the Brigade as mere bandits and hunt them without mercy. Gustin Marr had died for a crime his paymasters had commissioned.',
  },
  {
    id: 'b_thieveskeep', chapter: 1, title: 'Thieves\' Keep',
    text: 'The Brigade\'s next stronghold was Thieves\' Keep, a ruin north of Dorhaven held by Wolfram\'s sister Mirelle. She fought like one who believed, and she asked the cadets the question no one at Ygress would answer: who had paid for the war, and who had been paid by it? She escaped over the walls. Delan, the Papers note, was silent for the whole of the march home.',
  },
  {
    id: 'ev_tessa_kidnapped', chapter: 1, title: 'The Taking of Tessa Harrow',
    text: 'While Ygress\'s knights were abroad, the Brigade struck at the castle itself and carried off a girl they believed to be a daughter of House Valorne. She was Tessa Harrow, Delan\'s sister, and no Valorne at all. When Argan Vire sneered that she was "only a commoner" and not worth the risk of rescue, Delan struck him, and Rhen sent Argan from the house. It was the first time Rhen chose his friend over his class. It would not be the last.',
  },
  {
    id: 'b_lenara', chapter: 1, title: 'The Death of Mirelle Fell',
    text: 'Mirelle Fell met the cadets again on the high Lenara Plateau, and this time she did not escape. Before she fell she argued with Rhen across the heather — of nobles who feast while soldiers starve, of a kingdom that spends its poor like coin. Rhen had no answer for her, and he knew it. The shepherds say the heather blooms red, to this day, at the place where she died.',
  },
  {
    id: 'ev_campfire', chapter: 1, title: 'Beneath the Stars',
    text: 'On the night after Lenara, the two foster-brothers sat by a campfire and spoke of stars and of sisters. Delan asked whether a commoner could ever change anything, or whether he was only a piece on another man\'s board. Rhen told him the stars did not care for birth. I have that conversation from a letter Rhen wrote many years afterwards; he said he had meant every word, and had not understood a single one of them.',
  },
  {
    id: 'b_fovain', chapter: 1, title: 'The Duel at Fovain Mill',
    text: 'At the lonely windmill of Fovain, Wolfram Fell himself barred the road north. He fought with the holy sword arts of the old orders, and the Papers say the cadets could barely stand against him. Wounded at last, he withdrew into the snow rather than die for nothing, telling Rhen that his sister\'s blood was on the hands of Rhen\'s own house. It was the first of many truths Rhen would hear from his enemies before he heard it from his kin.',
  },
  {
    id: 'b_ziekhold', chapter: 1, title: 'Fort Ziekhold',
    text: 'At the snowbound fort of Ziekhold, the last of the Brigade held Tessa Harrow hostage and asked for terms. Zander Valorne refused to bargain, and Argan Vire, restored to favour, loosed a single arrow that pierced both the hostage-taker and the hostage. In the fight that followed, Rhen and Delan turned their swords on their own countrymen, and Delan cut Argan down. Then the Northsky knights fired the fort, and its powder stores went up with Delan Harrow still inside, cradling his sister\'s body.',
  },
  {
    id: 'ev_rhen_renounces', chapter: 1, title: 'The Name Cast Off',
    text: 'Rhen Valorne walked away from Fort Ziekhold alone. He did not return to Ygress; he sent no word to his brothers; he took no title, no allowance and no name but the one his mother had given him. For a year the records of House Valorne speak of him only as "the youngest son, abroad". When he surfaces again, it is on the muster roll of a mercenary company, as a sword-for-hire under a dark knight called Garmond.',
  },

  // ==========================================================================
  //  CHAPTER II — Pawn and Player
  // ==========================================================================
  {
    id: 'b_dorhaven2', chapter: 2, title: 'Return to Dorhaven',
    text: 'A year after Ziekhold, Rhen came back to Dorhaven in pursuit of the princess and her abductor. He found the city already caught in a stranger game: a knight of the Church had bribed a thief to "mislay" Princess Oriane, and Black Lion soldiers were combing the streets. Adria Oakhelm and Garmond fought at Rhen\'s side. The Papers observe that Garmond was curiously well informed about the Church\'s interest in the princess.',
  },
  {
    id: 'b_arawen', chapter: 2, title: 'Arawen Woods',
    text: 'In the dim oaks of Arawen, the party came upon a yellow-feathered kwehbo beset by goblins and panthers. Rhen knew the bird\'s harness: it was Bocco, the old mount of Wolfram Fell, left masterless when the Brigade broke. Rhen saved the bird, and the bird, with the stubbornness of its kind, would not afterwards be parted from him. Some chroniclers omit Bocco from their accounts entirely; I consider this a grave injustice.',
  },
  {
    id: 'b_zirkel', chapter: 2, title: 'The Betrayal at Zirkel Falls',
    text: 'At Zirkel Falls, Rhen found Delan Harrow alive — and defending the princess against Northsky assassins sent to silence her. There, too, Garmond revealed his true employer, turning his blade on Rhen alongside the very knights he had pretended to fight. After the battle the foster-brothers spoke across the roaring water, as strangers who had once been more than brothers. Delan let Rhen take Oriane toward the Church for safety, and was gone into the spray.',
  },
  {
    id: 'b_zelland', chapter: 2, title: 'The Rescue at Zelland',
    text: 'In the fort-city of Zelland, bullies of the Baird Trading Company were hunting a young engineer named Mattis Brunel, who carried a Lost Age pistol and a secret he would not share. Rhen\'s company intervened. Mattis, who mistrusted nobles and mercenaries in equal measure, took some convincing that he had been rescued rather than acquired. He joined them in the end, as much from necessity as from trust.',
  },
  {
    id: 'b_barrowhill', chapter: 2, title: 'Ambush on Barrow Hill',
    text: 'Among the ancient burial mounds of Barrow Hill, soldiers without colours fell upon the party on the road to Lyonesse. Once they were beaten off, the company reached Castle Lyonesse, where Cardinal Dracomir received the princess with every courtesy. Oriane and Adria were given rooms in the castle; Rhen was given thanks and a purse. The Cardinal, the Papers remark, was a generous man with other people\'s gratitude.',
  },
  {
    id: 'b_zigor', chapter: 2, title: 'Across Zigor Fen',
    text: 'Mattis\'s father, the master artificer Bastian Brunel, had been seized by the Baird Company in Cogsgard, and the quickest road there ran through the poisoned mire of Zigor Fen. The fen\'s dead do not lie still, and the party fought its way through walking bones and worse. Mattis spoke little on the road. He said only that the thing the Company wanted was not worth his father\'s life, and that he would hand it over if he had to.',
  },
  {
    id: 'b_cogsgard', chapter: 2, title: 'The Stone of Taurus',
    text: 'In the steam-choked streets of Cogsgard, Rhen offered the Baird Company a stone in exchange for Bastian Brunel — a fake, as the Company swiftly discovered. The fight that followed freed the old artificer and revealed the true prize: a Zodiac Stone, the Stone of Taurus, which Mattis had found in a Lost Age ruin and hidden in the works of a clock. It was the first holy relic to pass into Rhen\'s hands. Bastian warned him that such stones were never merely holy.',
  },
  {
    id: 'ev_delan_current', chapter: 2, title: 'Against the Current',
    text: 'On the road out of Cogsgard, Rhen met Delan once more, alone and unarmed. Delan spoke of the Church\'s plans for the princess, and of the Lions who would crown her or kill her as it suited them. "Everyone is swept along by the current," he said. "I\'m swimming against it." Rhen asked him where he was swimming to. Delan did not answer, and I have come to believe he did not yet know.',
  },
  {
    id: 'b_barrowvale', chapter: 2, title: 'The Bait at Barrow Vale',
    text: 'Adria Oakhelm was "released" from Castle Lyonesse by the Cardinal\'s men and sent alone down the road through Barrow Vale — where more of the Cardinal\'s men lay in wait to kill her. It was a crude plan, and it failed only because Rhen\'s company chose the same road. Wounded and furious, Adria told Rhen what she had overheard: that the Cardinal had never meant to protect the princess, only to spend her.',
  },
  {
    id: 'b_golgrand', chapter: 2, title: 'Golgrand Gallows',
    text: 'At the execution ground of Golgrand, among gibbets heavy with the Church\'s heretics, Garmond waited with a company of knights. The ambush was well laid, and the gallows made a grim fortress. Rhen\'s company broke through, but Garmond escaped to the castle. The Papers note that one of the hanged men wore the grey of the Ashen Brigade, and that Rhen stopped to cut him down.',
  },
  {
    id: 'b_lyonesse', chapter: 2, title: 'The Death of Garmond',
    text: 'Before the gates of Castle Lyonesse, Garmond faced his former hireling for the last time. He fought for pay to the end, and died, the Papers say, asking whether the Cardinal\'s gold would still spend in whatever place he was going. He was a skilled and faithless man, and I do not pretend he was anything else. Yet Rhen buried him with his sword, which is more than the Cardinal would have done.',
  },
  {
    id: 'b_vepar', chapter: 2, title: 'Vepar, the Defiled King',
    text: 'In the chapel of Castle Lyonesse, Cardinal Dracomir held a Zodiac Stone aloft and spoke of Saint Auren\'s will. Then the stone blazed, and the Cardinal became something else: Vepar, the Defiled King, an Umbral Lord of the Scorpion, which had worn his flesh like a vestment. Rhen\'s company destroyed it. But the princess was already gone — Delan had carried her to the Black Lion, Duke Galtran — and with her flight the last hope of peace in Ivaldis went out.',
  },
  {
    id: 'ev_pride_war_begins', chapter: 2, title: 'The Pride War',
    text: 'King Ondrel died that summer, and the kingdom split along the line of its two great dukes. Duke Laurent, the White Lion, declared for Queen Louvaine and the infant Prince Orin; Duke Galtran, the Black Lion, declared for Princess Oriane. The Northsky and Southsky orders marched against each other, and the Glorian Church, which had fed both Lions from its hand, watched and waited. The chronicles call it the Pride War. The peasants who fed both armies called it by other names.',
  },

  // ==========================================================================
  //  CHAPTER III — The Brave and the Damned
  // ==========================================================================
  {
    id: 'b_colgrave', chapter: 3, title: 'Colgrave',
    text: 'In the mining town of Colgrave, thieves had cornered a young astrologer named Oren Durant, adopted son of the famous Count Cedric Orland. Rhen\'s company drove them off. Oren, curious and fearless in the way of scholars, attached himself to the company and began to keep a journal of all he saw. Those pages, much burned and much hidden, are the foundation of everything I have written here.',
  },
  {
    id: 'b_lesandre', chapter: 3, title: 'Branded a Heretic',
    text: 'In the royal capital, Rhen sought out his brother Zander to warn him of the Umbrals hidden in the Zodiac Stones. Zander would not hear it. Before the day was out, Inquisitor Zalmon had named Rhen a heretic before the city and set the Church\'s soldiers upon him; his sister Alys, who studied at the abbey school of Orvelle, fought at his side and would not leave him. From that day the Church\'s rolls name Rhen Valorne an enemy of the faith. They name him so still.',
  },
  {
    id: 'b_orvelle_b2', chapter: 3, title: 'The Vaults of Orvelle',
    text: 'Rhen brought Alys home to Orvelle Abbey, only to find the Sanctum Knights already within, searching the vaults beneath the chapel. The fighting descended level by level into the old stone. The brothers of Orvelle had hidden their treasures well; the Sanctum Knights did not care how much they broke to find them.',
  },
  {
    id: 'b_orvelle_b3', chapter: 3, title: 'Isidore Tengel',
    text: 'At the third level of the vault, Isidore Tengel, son of the Sanctum Knights\' commander, waited with his father\'s blade and his father\'s certainty. He fought well and yielded nothing. When the battle turned against him he withdrew upward — toward the chapel and the abbey\'s frightened brothers, and toward Alys.',
  },
  {
    id: 'b_orvelle_b1', chapter: 3, title: 'The Chapel of Orvelle',
    text: 'In the abbey chapel, Wolfram Fell appeared once more, wearing the white of a Sanctum Knight. The man who had executed Gustin Marr for dishonour had sold his sword to the very Church that had broken his Brigade. While Rhen fought him, Isidore seized Alys and carried her away, and Wolfram took the Stone of Virgo from its hiding place beneath the altar. It is the one battle, the Papers say, of which Rhen would never afterwards speak.',
  },
  {
    id: 'ev_germaine_scriptures', chapter: 3, title: 'The Germaine Scriptures',
    text: 'Among the ruins of his abbey, the dying Brother Simeon placed a book in Rhen\'s hands. It was the Germaine Scriptures — the forbidden gospel of the man the Church calls Auren\'s betrayer — and it told a different story of the Saint: of a man, not a god, who had used the Zodiac Stones to seize a kingdom. Simeon died that night. The Scriptures passed from Rhen to Oren Durant and at last, through many hands and several fires, to me.',
  },
  {
    id: 'b_grogmoor', chapter: 3, title: 'Grogmoor Hill',
    text: 'On the drovers\' road over Grogmoor Hill, a band of monks and chemists in the Church\'s pay tried to take the Scriptures by force, and failed. In Dorhaven afterwards, a Hell Knight named Malik Galthane came to Rhen with a demand: the Scriptures, in exchange for his sister, whom he claimed Rhen\'s friends were hiding. It was a lie, but it was the first thread of a larger knot.',
  },
  {
    id: 'b_yardale', chapter: 3, title: 'Yardale',
    text: 'In the narrow streets of Yardale, Malik Galthane\'s true errand came clear: Grand Duke Barrington had sent him to kill his own sister Rana, who had fled the Duke\'s service. Rhen\'s company saved her. Rana Galthane, a Heaven Knight of terrible skill, told them what she knew of Barrington\'s dealings with the Church, and joined them — if only, she said, because she had nowhere else to go.',
  },
  {
    id: 'b_yewgrove', chapter: 3, title: 'Yewgrove',
    text: 'The road to Riverain passed through the ancient graveyard of Yewgrove, where Barrington\'s hirelings had raised the dead to wait for the company. The skeletons wore the Grand Duke\'s colours. It was, I think, the first time Rhen understood that the powers he fought had no scruple at all about what they used, living or dead.',
  },
  {
    id: 'b_riverain_gate', chapter: 3, title: 'The Gates of Riverain',
    text: 'At the gates of Riverain Castle, Malik Galthane stood with the Grand Duke\'s knights against his sister and her new companions. Rana would not kill him. Beaten, Malik was spared at her plea and stumbled back into the castle with his master\'s men. The Papers record that Rana wept at the gate, and then drew her sword and went in.',
  },
  {
    id: 'b_beleth', chapter: 3, title: 'Beleth, the Ram of Ruin',
    text: 'Within the keep of Riverain, Wolfram Fell waited alone. He had given everything to his cause, then his cause to the Church, and now he gave the Church the last thing he had. When his sword failed him he called upon the Stone of Aries, and it answered: Wolfram died, and Beleth, an Umbral Lord of the Ram, rose in his place. Rhen destroyed it. He wrote later that he mourned Wolfram, and did not know whether that made him a good man or a fool.',
  },
  {
    id: 'ev_isidore_slain', chapter: 3, title: 'The Vessel',
    text: 'While Rhen fought in the keep of Riverain, Volmar Tengel, commander of the Sanctum Knights, met his son Isidore in the castle\'s upper halls. Isidore had begun to doubt, and he said so. Volmar killed him with his own hand, and took Alys Valorne, whom the Umbrals had named "the Vessel". Of all the crimes in this chronicle, a father\'s murder of his son for a demon\'s sake is the one I find hardest to set down.',
  },
  {
    id: 'b_riverain_roof', chapter: 3, title: 'The Rooftop of Riverain',
    text: 'On the high roof of Riverain Castle, Grand Duke Barrington shot Malik Galthane down for failing him — and was himself thrown from the parapet by Cerise and Lida, the smiling assassin-maids of the Marquis Elmond. The Marquis, the very man Rhen had once rescued from Sandrat Cellar, stepped from the shadows to claim what Barrington had held. Rhen\'s company fought him and his maids to a standstill. When the smoke cleared, a Zodiac Stone blazed over Malik\'s body, and he rose, living, to stand beside his sister.',
  },

  // ==========================================================================
  //  CHAPTER IV — For Whom the Crown
  // ==========================================================================
  {
    id: 'b_dogol', chapter: 4, title: 'Dogol Pass',
    text: 'In the high pass of Dogol, Melisande Tengel, daughter of Volmar, confronted Rhen with her brother\'s name on her lips. She had been told that the heretic murdered Isidore at Riverain. Rhen told her the truth; she did not believe him, and the fight in the pass was bitter. She withdrew in the end — not persuaded, the Papers say, but no longer certain.',
  },
  {
    id: 'b_bervaine', chapter: 4, title: 'The Free City of Bervaine',
    text: 'In Bervaine, Melisande struck again, and again withdrew. There too, in the shadow of the free city\'s spires, Rhen met Delan Harrow — now sworn protector of Princess Oriane and a captain of the Black Lion — who laid bare the Church\'s design: to let the Lions bleed each other white, and then crown whomever it pleased. Their meeting was cut short by Inquisitor Zalmon, who had come to burn one heretic and found two.',
  },
  {
    id: 'b_finneth', chapter: 4, title: 'The Inquisitor at Finneth',
    text: 'By the iron-red waters of the Finneth River, Inquisitor Zalmon made his last stand against the heretic he had named. He fought with the fervour of a man who had never once doubted, and he died in the same state. The Church records him as a martyr. I record only that he was sincere, and that sincerity in the service of liars is not a virtue.',
  },
  {
    id: 'b_zeltmoor', chapter: 4, title: 'Zeltmoor Castle',
    text: 'At Zeltmoor, the Black Lion\'s seat, Rhen sought Count Cedric Orland, the Thunder Saint, and learned that Duke Galtran had arrested him for treason — for Orland had refused to fight the war on the Church\'s terms. Galtran\'s honour guard barred the way. Oren Durant, the Count\'s adopted son, brought the company through with a pass forged in his own hand, which I am told was a very good forgery.',
  },
  {
    id: 'b_bedlam', chapter: 4, title: 'The Bedlam Wastes',
    text: 'The road from Zeltmoor to Bethel ran through the howling red canyons of the Bedlam Wastes. The Lions\' outriders patrolled it, and so did beasts that had learned to follow armies for the leavings. The company crossed in three days and fought twice. They reached Bethel on the eve of the battle that would decide the Pride War.',
  },
  {
    id: 'b_bethel_wall', chapter: 4, title: 'The Walls of Bethel',
    text: 'The Northsky and Southsky armies met beneath Bethel Garrison, and the fortress became the anvil on which the kingdom was hammered. Rhen\'s company scaled the walls in the confusion — the accounts disagree on whether by the north wall or the south, and Rhen, when asked, would only say that it was cold. On the ramparts they learned that Count Orland was held within.',
  },
  {
    id: 'b_bethel_sluice', chapter: 4, title: 'The Sluice of Bethel',
    text: 'To end the slaughter on the plain, Rhen\'s company fought their way to Bethel\'s great sluice and threw open its gates. The river poured across the battlefield, and both armies broke for higher ground; hundreds who would have been spent that day lived to see another. I count it the finest thing Rhen Valorne ever did, and the least remembered.',
  },
  {
    id: 'ev_lions_fall', chapter: 4, title: 'The Fall of the Two Lions',
    text: 'The Pride War ended not on the field but in two tents. Dorian Valorne stabbed Duke Laurent, the White Lion, and took his command; Delan Harrow killed Duke Galtran, the Black Lion, and took his. In a single night the two men who had begun the war were dead, and the two men who had killed them held the armies of Ivaldis. One served the Church\'s demons. The other, I believe, served only Delan Harrow.',
  },
  {
    id: 'ev_thunder_saint', chapter: 4, title: 'The Thunder Saint',
    text: 'Count Cedric Orland was freed from his cell at Bethel in the chaos of the flood, and chose, to the astonishment of the kingdom, to follow a branded heretic rather than any lord. The Thunder Saint had fought in every great battle of the Fifty Winters, and it was said his sword could split the sky. He told Rhen he was too old to serve liars, and too stubborn to die in a cell.',
  },
  {
    id: 'b_germain', chapter: 4, title: 'Germain Peak',
    text: 'On the heights of Germain Peak, black-clad assassins fell upon the company from the rocks. They wore no colours, but they fought in the manner of the Church\'s shadow-servants. Rhen\'s company threw them from the crags. Of the peak\'s namesake — the Germaine of the forbidden Scriptures, or some other — the hermits of the mountain would say nothing at all.',
  },
  {
    id: 'b_poskar', chapter: 4, title: 'Poskar Mere',
    text: 'On the misted shore of Poskar Mere, knights who had drowned in some forgotten battle rose from the water in rusted mail to bar the road to Limbourne. The fisherfolk said the Marquis of Limbourne had called them up. The fisherfolk, in this instance, were right.',
  },
  {
    id: 'b_limbourne_gate', chapter: 4, title: 'The Gate of Limbourne',
    text: 'At the gate of Limbourne Castle, Cerise and Lida, the Marquis\'s assassin-maids, waited in the rain. They fought with poisoned blades and a sisterly ease, and they laughed as they fought. When at last they fell back into the castle, the Papers record, they were laughing still.',
  },
  {
    id: 'b_limbourne_elmond', chapter: 4, title: 'The Hall of Limbourne',
    text: 'In the great hall of Limbourne, the Marquis Elmond received Rhen as an old acquaintance and reminded him that they had first met in a cellar beneath Dorhaven. Elmond had not aged a day since the Fifty Winters\' War, and the reason was not a pleasant one. Wounded, he withdrew to his chapel, smiling, as though the battle had only just begun.',
  },
  {
    id: 'b_zepar', chapter: 4, title: 'Zepar, the Twin-Souled',
    text: 'In the chapel of Limbourne, Elmond at last let the Stone of Gemini take him wholly, and Zepar, an Umbral Lord of the Twins, stood before the company. Melisande Tengel, who had followed Rhen to Limbourne to kill him, saw the demon with her own eyes and understood at last what her father served. When Zepar was destroyed she laid her sword at Rhen\'s feet. Few converts have been made so quickly, or at such cost.',
  },
  {
    id: 'b_ygress', chapter: 4, title: 'Castle Ygress',
    text: 'Zander Valorne learned the truth of his father\'s death and rode to Castle Ygress to call his brother to account. Rhen arrived to find the hall in ruins, Zander maddened with grief and rage, and Dorian standing over him with the Stone of Capricorn in his hand. Dorian confessed it all — the poison in their father\'s cup, the bargain with the Church — and then became Azazel, the Umbral Lord of the Goat. Of the three sons of Baldric Valorne who met in that hall, only one walked out of it.',
  },
  {
    id: 'b_murondel1', chapter: 4, title: 'The Streets of Murondel',
    text: 'Rhen came to the Holy See of Murondel to find Alys, and found its streets held by Sanctum Knights — and by his brother. Zander Valorne, slain at Ygress, had been raised by the Church\'s demons as an undead champion. In a moment of clarity he begged Rhen to end it, and Rhen did. Of all the things he had to do in that war, the Papers say, this was the one he could never afterwards forgive.',
  },
  {
    id: 'b_murondel2', chapter: 4, title: 'The Cloister of Murondel',
    text: 'In the cloister of the Holy See, the Sanctum Knight Rolf Wodring barred Rhen\'s path. Rolf was a pious man who had long ago stopped asking what his piety was for. He fought well, and withdrew deeper into the holy city, toward the great chapel.',
  },
  {
    id: 'b_murondel3', chapter: 4, title: 'The Great Chapel of Murondel',
    text: 'In the great chapel of the Holy See, the Sanctum Knight Clement Duran awaited the heretic beneath windows of stained glass taller than any tower in Galwyn. Pontiff Marcellus did not appear; what became of him that day is a matter the Church has never explained. When Clement fell back, the trail led not deeper into Murondel but back to Orvelle Abbey, whose vaults went further down than anyone had known.',
  },
  {
    id: 'b_orvelle_b4', chapter: 4, title: 'The Fourth Vault',
    text: 'Returning to the ruin of Orvelle Abbey, the company descended past the vaults they had fought through a year before, to a fourth level they had never seen. Barrick Fendsor of the Sanctum Knights held it. He was a huge man with a huge voice, and he fought as though the stair behind him led to heaven. It did not.',
  },
  {
    id: 'b_orvelle_b5', chapter: 4, title: 'The Fifth Vault',
    text: 'In the deepest vault of Orvelle, Rolf and Clement stood together for the last time. When they were beaten, Rhen opened the Germaine Scriptures upon an altar older than the abbey itself — and the stones answered. Light took the company, and when it faded they stood somewhere far beneath Murondel, in a city of the dead that no living map records.',
  },
  {
    id: 'b_necropolis', chapter: 4, title: 'The Necropolis of Murondel',
    text: 'Beneath the Holy See lies an older city, silent and sealed: the Necropolis of Murondel, where the kings of the Lost Age were buried with their machines. Clement Duran found the company there and fought them among the tombs, with a desperation that was almost grief. He died there. The Church lists him as lost on pilgrimage.',
  },
  {
    id: 'b_lostsanctum', chapter: 4, title: 'The Lost Sanctum',
    text: 'Deeper still lay the Lost Sanctum, a temple older than Saint Auren\'s name, where the Umbrals were first worshipped. Barrick Fendsor made his last stand at its threshold, alone, because there was no one left to stand with him. The Papers say he asked Rhen at the end whether the Saint had truly ascended. Rhen told him what the Scriptures said. Barrick laughed, and died.',
  },
  {
    id: 'b_astaroth', chapter: 4, title: 'Astaroth, the Lion Unbound',
    text: 'The Lost Sanctum opened at last onto the Airship Graveyard, a plain of shattered sky-ships where the Lost Age fought its final war. There Volmar Tengel waited with Alys, and there he let the Stone of Leo consume him: Astaroth, first among the Umbral host, whose name the Scriptures write in red. Rhen\'s company fought it among the wrecks and destroyed it. Its death opened the way for the one it had served.',
  },
  {
    id: 'b_altessa', chapter: 4, title: 'Altessa, the Crimson Seraph',
    text: 'From the blood of the Umbral Lords and the body of Alys Valorne rose Altessa, the Crimson Seraph — the being the Church had worshipped for a thousand years as Saint Auren. She was beautiful, as such things are, and she was hungry. In the second hour of the battle Alys tore free of her and fought beside her brother against the thing that had worn her. What happened at the end, no one who remained in Ivaldis saw; the Papers say only that the Airship Graveyard burned with a light seen from Lesandre.',
  },
  {
    id: 'ev_epilogue', chapter: 4, title: 'An Empty Grave',
    text: 'The Church held a funeral for Alys Valorne, and buried an empty coffin. Oren Durant attended, and afterwards, on the hill above the graveyard, he saw two riders on kwehbos — a young man and a young woman — who raised their hands to him and rode away west. In Lesandre, King Delan and Queen Oriane were crowned with the Church\'s blessing; and on a flowered hillside not long after, the Queen drew a knife upon her husband, and what passed between them then the chronicles do not say. The Church seized Oren\'s Papers and burned them, and — so my family has always said — their author with them. I have spent my life gathering what the fire missed: this is the tale the Church burned, and you must judge it as you will.',
  },
];
