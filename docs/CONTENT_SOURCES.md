# Content expansion reference notes

Reviewed 26 September 2026. This project uses the original names and adapted story in
[DESIGN.md](DESIGN.md). The references below informed missing subjects, quest relationships,
and tactical explanations. New narrative text is original; the game's own definitions
and engine determine the rules shown to players.

## Requested references

| Reference | Access and use |
| --- | --- |
| [Final Fantasy Wiki: Final Fantasy Tactics](https://finalfantasy.fandom.com/wiki/Final_Fantasy_Tactics) | Direct page fetch was blocked; indexed page text and related articles were available. Used for monster families, recruitment, special abilities, and optional-character quest relationships. |
| [Final Fantasy Wiki independent site: Final Fantasy Tactics](https://finalfantasywiki.com/wiki/Final_Fantasy_Tactics) | The URL redirected repeatedly to `AdPage.html`, and no useful indexed copy was returned. It could not be used as factual evidence. |
| [StrategyWiki: Final Fantasy Tactics](https://strategywiki.org/wiki/Final_Fantasy_Tactics) | Indexed guide text and selected subpages were available despite a blocked direct landing-page fetch. Used to check the campaign/side-content outline and identify missing player guidance. |

## Specific references and resulting content

| Evidence | Result in this project |
| --- | --- |
| [StrategyWiki gameplay](https://strategywiki.org/wiki/Final_Fantasy_Tactics/Gameplay), [world-map walkthrough](https://finalfantasy.fandom.com/wiki/Walkthrough:Final_Fantasy_Tactics/Zerobandwidth/Overview) | Expanded How to Play and added a Chronicle atlas showing unlocked locations, their services, roads and current encounter possibilities. |
| [Status reference](https://finalfantasy.fandom.com/wiki/Final_Fantasy_Tactics_statuses) | Identified gaps in the original brief help. The expanded manual includes status and cure tables generated from this game's definitions. |
| [Enemy families](https://finalfantasy.fandom.com/wiki/Final_Fantasy_Tactics_enemies), [monster overview](https://finalfantasy.fandom.com/wiki/Monster_(term)), [Beastmaster](https://finalfantasy.fandom.com/wiki/Beastmaster_(Tactics)) | Added a 48-species Chronicle bestiary: descriptions, movement, traits, arts, poach rewards and habitats. Corrected the secret-art gate for species with only two regular arts. |
| [Optional characters](https://strategywiki.org/wiki/Final_Fantasy_Tactics/Optional_characters), [Beowulf Cadmus](https://finalfantasy.fandom.com/wiki/Beowulf_Cadmus), [Construct 8](https://finalfantasy.fandom.com/wiki/Construct_8_(Tactics)) | Filled the colliery → Aquarius → automaton → temple → Cancer → second machine progression. Added the missing machine-discovery scene and a second phase for the temple guardian. |
| [Cloud Strife in Tactics](https://finalfantasy.fandom.com/wiki/Cloud_Strife_(Tactics)), [Auracite](https://finalfantasy.fandom.com/wiki/Auracite_(Tactics)) | Connected the stranger's arrival to the temple stone and second machine. Preserved the existing flower choice and rescue route. Added protection for the stranger during the rescue. |
| [Temple walkthrough](https://finalfantasy.fandom.com/wiki/Walkthrough:Final_Fantasy_Tactics/BlueHighwind/Part_53), [rescue walkthrough](https://finalfantasy.fandom.com/wiki/Walkthrough:Final_Fantasy_Tactics/Catuse/Steel_Ball_Found!) | Added the guardian's one-HP emergency restart and the rescue's missing protected objective. |
| [Errands](https://finalfantasy.fandom.com/wiki/Errands), [salvage](https://finalfantasy.fandom.com/wiki/The_Hindenburg), [company cargo](https://finalfantasy.fandom.com/wiki/The_Fate_of_Our_Company), [tutoring](https://finalfantasy.fandom.com/wiki/Arithmeticks_Tutor_Wanted), [exploration](https://finalfantasy.fandom.com/wiki/Adventurers_Wanted) | Added original salvage, teaching and exploration commissions, plus a mining sequence whose success opens a follow-up. |
| [Marach Galthena](https://finalfantasy.fandom.com/wiki/Marach_Galthena), [Orran Durai](https://finalfantasy.fandom.com/wiki/Orran_Durai) | Corrected the hostage exchange and rooftop records; expanded staged character biographies and the historian's family context. |

## Coverage and adaptation boundaries

- All 18 existing optional battles now have Chronicle records, with additional entries for
  discoveries and recruitment milestones. They unlock through actual completion flags.
- Zodiac records, character biographies and tavern directions follow the revised quest chain.
  Major revelations remain behind story or quest flags.
- Six additional errands expand mining, salvage, teaching and exploration, including a
  linked mining follow-up and two new discoveries.
- The atlas and bestiary derive names, abilities, loot and encounters from game data,
  avoiding a second independent set of gameplay values.
- The handbook describes this adaptation. It does not imply exact PlayStation or War of
  the Lions rules: for example, this engine uses a three-tile Beast Lore radius plus a
  level requirement, and the Midnight Deep uses authored exit sigils.
- The existing twenty-job tree, original cast, and campaign remain the project's design.
  This pass does not add every feature from later releases of Final Fantasy Tactics.

## Verification

`npm run build` includes TypeScript and content validation. The validator now checks
Chronicle commands/unlocks, biography and rumor flags, quest prerequisites, and errand
discovery references. Regression tests cover the optional quest route, older saves'
completion flags, rescue objectives, the guardian's reserve phase, bestiary coverage,
atlas visibility and the secret-art requirement. `e2e/reference.spec.ts` checks the
player-facing reference menus and their layout.

Final verification: production build and all 60 tests passed under the project's Node 22
runtime. All four reference-menu tests passed in desktop and mobile Chromium. WebKit
profiles could not launch because the host lacks their required shared libraries;
this is not a claim of Safari verification.
