// Original player guidance. The supplied wikis informed the coverage checklist;
// actual rules come from battle/*, game/* and the registered content below.
// Every sentence is a line in the player's language (src/i18n/ui/manual.ts), one per paragraph.

import { JOB_LEVEL_JP } from "../../battle/stats";
import { STATUS } from "../../battle/status";
import { fmtList, t } from "../../i18n";
import { ability, genericJobs, JOBS } from "../db";
import type { StatusId } from "../types";

export interface GuideTopic {
	id: string;
	title: string;
	text: string;
	links?: Array<{ title: string; url: string }>;
}

export interface ManualOptions {
	/** A gamepad is in use: the manual's own controls are described for it. */
	pad?: boolean;
}

const JOB_ORDER = [
	"squire",
	"chemist",
	"knight",
	"archer",
	"monk",
	"priest",
	"wizard",
	"timeMage",
	"summoner",
	"thief",
	"mystic",
	"orator",
	"geomancer",
	"lancer",
	"samurai",
	"ninja",
	"arithmancer",
	"bard",
	"dancer",
	"mime",
];

/** A topic's text: its paragraphs, a blank line apart. */
const paragraphs = (...texts: string[]) => texts.join("\n\n");
/** The paragraphs of these lines. */
const lines = (...ids: string[]) => paragraphs(...ids.map((id) => t(id)));

function jobRequirements(): string {
	return genericJobs()
		.sort((a, b) => JOB_ORDER.indexOf(a.id) - JOB_ORDER.indexOf(b.id))
		.map((j) => {
			const levels = (j.requires ?? []).map((r) =>
				t("manual.job_tree.requirement", {
					job: JOBS.get(r.job)?.name ?? r.job,
					level: r.level,
				}),
			);
			const requirements = levels.length
				? fmtList(levels)
				: t("manual.job_tree.from_start");
			const row = !j.gender
				? "manual.job_tree.row"
				: j.gender === "m"
					? "manual.job_tree.row_men"
					: "manual.job_tree.row_women";
			return t(row, { job: j.name, requirements });
		})
		.join("\n\n");
}

function statusGlossary(bad: boolean): string {
	const elsewhere = new Set<StatusId>([
		"ko",
		"charging",
		"performing",
		"jumping",
		"defending",
	]);
	return Object.values(STATUS)
		.filter((s) => s.bad === bad && !s.hidden && !elsewhere.has(s.id))
		.map((s) => {
			const cancels = (s.cancels ?? []).filter((id) => !elsewhere.has(id));
			const row = s.ticks
				? cancels.length
					? "manual.status.timed_replaces"
					: "manual.status.timed"
				: cancels.length
					? "manual.status.untimed_replaces"
					: "manual.status.untimed";
			return t(row, {
				status: s.name,
				desc: s.desc,
				count: s.ticks,
				statuses: fmtList(cancels.map((id) => STATUS[id].name)),
			});
		})
		.join("\n\n");
}

function cures(): string {
	const ids = [
		"useAntidote",
		"useEyeDrop",
		"useEchoHerb",
		"useMaidensKiss",
		"useSoftener",
		"useHolyWater",
		"useRemedy",
		"stigmata",
		"esuna",
		"dispelMagic",
	];
	return ids
		.map((id) => {
			const a = ability(id);
			const removed = (a.effects ?? []).flatMap((e) =>
				e.type === "status" ? (e.remove ?? []) : [],
			);
			return t("manual.cures.row", {
				ability: a.name,
				statuses: fmtList(removed.map((id) => STATUS[id].name)),
			});
		})
		.join("\n\n");
}

function jobLevels(): string {
	const rows = JOB_LEVEL_JP.map((jp, i) =>
		t("manual.jp.table_row", { level: i + 1, jp }),
	);
	return `${t("manual.jp.table_heading")}\n${rows.join(" · ")}`;
}

/**
 * Build on opening so prerequisites, cures and durations match the current data, and the
 * text is in the player's language for the device in use.
 */
export function fieldManual({ pad = false }: ManualOptions = {}): GuideTopic[] {
	return [
		{
			id: "first-battle",
			title: t("manual.first_battle.title"),
			text: lines(
				"manual.first_battle.p1",
				"manual.first_battle.p2",
				"manual.first_battle.p3",
			),
		},
		{
			id: "controls",
			title: t("manual.controls.title"),
			text: lines(
				"manual.controls.keyboard",
				"manual.controls.mouse",
				"manual.controls.touch",
				"manual.controls.gamepad",
				pad
					? "manual.controls.this_manual_pad"
					: "manual.controls.this_manual",
			),
		},
		{
			id: "turns",
			title: t("manual.turns.title"),
			text: lines("manual.turns.p1", "manual.turns.p2", "manual.turns.p3"),
		},
		{
			id: "targeting",
			title: t("manual.targeting.title"),
			text: lines(
				"manual.targeting.p1",
				"manual.targeting.p2",
				"manual.targeting.p3",
				"manual.targeting.p4",
			),
		},
		{
			id: "terrain",
			title: t("manual.terrain.title"),
			text: lines(
				"manual.terrain.p1",
				"manual.terrain.p2",
				"manual.terrain.p3",
				"manual.terrain.p4",
			),
		},
		{
			id: "brave-faith",
			title: t("manual.brave_faith.title"),
			text: lines(
				"manual.brave_faith.p1",
				"manual.brave_faith.p2",
				"manual.brave_faith.p3",
			),
		},
		{
			id: "zodiac",
			title: t("manual.zodiac.title"),
			text: lines("manual.zodiac.p1", "manual.zodiac.p2", "manual.zodiac.p3"),
		},
		{
			id: "jp",
			title: t("manual.jp.title"),
			text: paragraphs(
				t("manual.jp.p1"),
				t("manual.jp.p2"),
				t("manual.jp.p3"),
				jobLevels(),
				t("manual.jp.p4"),
			),
		},
		{
			id: "job-tree",
			title: t("manual.job_tree.title"),
			text: paragraphs(
				t("manual.job_tree.p1"),
				jobRequirements(),
				t("manual.job_tree.p2"),
			),
		},
		{
			id: "loadout",
			title: t("manual.loadout.title"),
			text: lines(
				"manual.loadout.p1",
				"manual.loadout.p2",
				"manual.loadout.p3",
				"manual.loadout.p4",
			),
		},
		{
			id: "healing",
			title: t("manual.healing.title"),
			text: lines(
				"manual.healing.p1",
				"manual.healing.p2",
				"manual.healing.p3",
				"manual.healing.p4",
			),
		},
		{
			id: "cures",
			title: t("manual.cures.title"),
			text: paragraphs(t("manual.cures.p1"), cures(), t("manual.cures.p2")),
		},
		{
			id: "ailments",
			title: t("manual.ailments.title"),
			text: paragraphs(
				t("manual.ailments.p1"),
				statusGlossary(true),
				t("manual.ailments.p2"),
			),
		},
		{
			id: "boons",
			title: t("manual.boons.title"),
			text: paragraphs(
				t("manual.boons.p1"),
				statusGlossary(false),
				t("manual.boons.p2"),
			),
		},
		{
			id: "reactions",
			title: t("manual.reactions.title"),
			text: lines(
				"manual.reactions.p1",
				"manual.reactions.p2",
				"manual.reactions.p3",
				"manual.reactions.p4",
			),
		},
		{
			id: "special-arts",
			title: t("manual.special_arts.title"),
			text: lines(
				"manual.special_arts.p1",
				"manual.special_arts.p2",
				"manual.special_arts.p3",
				"manual.special_arts.p4",
			),
		},
		{
			id: "arithmeticks",
			title: t("manual.arithmeticks.title"),
			text: lines(
				"manual.arithmeticks.p1",
				"manual.arithmeticks.p2",
				"manual.arithmeticks.p3",
				"manual.arithmeticks.p4",
			),
		},
		{
			id: "fallen",
			title: t("manual.fallen.title"),
			text: lines(
				"manual.fallen.p1",
				"manual.fallen.p2",
				"manual.fallen.p3",
				"manual.fallen.p4",
			),
		},
		{
			id: "travel",
			title: t("manual.travel.title"),
			text: lines(
				"manual.travel.p1",
				"manual.travel.p2",
				"manual.travel.p3",
				"manual.travel.p4",
			),
		},
		{
			id: "errands",
			title: t("manual.errands.title"),
			text: lines(
				"manual.errands.p1",
				"manual.errands.p2",
				"manual.errands.p3",
				"manual.errands.p4",
			),
		},
		{
			id: "monsters",
			title: t("manual.monsters.title"),
			text: lines(
				"manual.monsters.p1",
				"manual.monsters.p2",
				"manual.monsters.p3",
				"manual.monsters.p4",
			),
		},
		{
			id: "treasure",
			title: t("manual.treasure.title"),
			text: lines(
				"manual.treasure.p1",
				"manual.treasure.p2",
				"manual.treasure.p3",
			),
		},
		{
			id: "saves",
			title: t("manual.saves.title"),
			text: lines(
				"manual.saves.p1",
				"manual.saves.p2",
				"manual.saves.p3",
				"manual.saves.p4",
			),
		},
		{
			id: "references",
			title: t("manual.references.title"),
			text: lines("manual.references.p1", "manual.references.p2"),
			links: [
				{
					title: t("manual.references.link_ffwiki"),
					url: "https://finalfantasy.fandom.com/wiki/Final_Fantasy_Tactics",
				},
				{
					title: t("manual.references.link_iffwiki"),
					url: "https://finalfantasywiki.com/wiki/Final_Fantasy_Tactics",
				},
				{
					title: t("manual.references.link_strategywiki"),
					url: "https://strategywiki.org/wiki/Final_Fantasy_Tactics",
				},
				{
					title: t("manual.references.link_strategywiki_gameplay"),
					url: "https://strategywiki.org/wiki/Final_Fantasy_Tactics/Gameplay",
				},
				{
					title: t("manual.references.link_ffwiki_statuses"),
					url: "https://finalfantasy.fandom.com/wiki/Final_Fantasy_Tactics_statuses",
				},
				{
					title: t("manual.references.link_ffwiki_errands"),
					url: "https://finalfantasy.fandom.com/wiki/Errands",
				},
			],
		},
	];
}
