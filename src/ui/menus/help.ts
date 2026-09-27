// "How to Play" — field manual, reference tables and controls.

import { fieldManual } from "../../data/guides/fieldManual";
import { h } from "../dom";
import { menu } from "../widgets";
import { overlay } from "./common";

export async function openHelp() {
	const ov = overlay("How to Play");
	const topics = fieldManual();
	let body = null as HTMLElement | null;
	let textPane = null as HTMLElement | null;
	let shown = -1;
	const show = (i: number) => {
		// Re-selecting a topic preserves its text scroll position.
		if (shown === i) return;
		shown = i;
		body?.remove();
		const topic = topics[i];
		textPane = h(
			"div",
			{
				role: "region",
				"aria-label": topic.title,
				style: {
					lineHeight: "1.55",
					marginTop: "6px",
					overflowY: "auto",
					minHeight: "0",
				},
			},
			h("div", { style: { whiteSpace: "pre-wrap" } }, topic.text),
			...(topic.links ?? []).map((link) =>
				h(
					"p",
					{ style: { margin: "10px 0 0" } },
					h(
						"a",
						{
							href: link.url,
							target: "_blank",
							rel: "noopener noreferrer",
							style: { color: "inherit", textDecoration: "underline" },
						},
						link.title,
					),
				),
			),
		);
		body = h(
			"div.panel.detail.titled",
			{
				style: {
					right: "16px",
					top: "64px",
					width: "min(620px, 60vw)",
					maxHeight: "calc(78 * var(--vh))",
					display: "flex",
					flexDirection: "column",
				},
			},
			h("div.title-plate", null, topic.title),
			h(
				"div.muted",
				{ style: { fontSize: ".82em", flexShrink: "0" } },
				"Scroll text: ←/→ · Page Up/Down · wheel · swipe",
			),
			textPane,
		);
		ov.root.appendChild(body);
	};
	try {
		// Choosing keeps the topic open; Back leaves. Reference text scrolls
		// independently of the topic selector with keyboard, gamepad or touch.
		await menu({
			items: topics.map((t, i) => ({ label: t.title, value: i })),
			x: 16,
			y: 64,
			title: "Topics",
			parent: ov.root,
			keepOpenOnChoose: true,
			maxHeight: "calc(70 * var(--vh))",
			onHover: (i) => {
				if (i !== null) show(i as number);
			},
			onAction: (a) => {
				if (a !== "left" && a !== "right" && a !== "prev" && a !== "next")
					return false;
				textPane?.scrollBy({
					top:
						(a === "left" || a === "prev" ? -1 : 1) *
						Math.max(80, textPane.clientHeight * 0.7),
				});
				return true;
			},
		}).promise;
	} finally {
		body?.remove();
		ov.close();
	}
}
