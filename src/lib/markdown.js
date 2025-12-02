/**
 * Escape HTML to keep preview output sanitized.
 */
function escapeHtml(value) {
	return (value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function applyInlineFormatting(line) {
	let next = line;
	next = next.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
	next = next.replace(/__(.+?)__/g, "<strong>$1</strong>");
	next = next.replace(/\*(.+?)\*/g, "<em>$1</em>");
	next = next.replace(/_(.+?)_/g, "<em>$1</em>");
	next = next.replace(/\+\+(.+?)\+\+/g, "<u>$1</u>");
	next = next.replace(/~~(.+?)~~/g, "<s>$1</s>");
	return next;
}

export function renderMarkdown(content) {
	const escaped = escapeHtml(content ?? "");
	const lines = escaped.split(/\r?\n/);
	const html = [];
	const listItems = [];
	let listHasTasks = false;

	const flushList = () => {
		if (!listItems.length) return;
		const className = listHasTasks ? ' class="task-list"' : "";
		html.push(`<ul${className}>${listItems.join("")}</ul>`);
		listItems.length = 0;
		listHasTasks = false;
	};

	for (const line of lines) {
		const heading = /^(#{1,6})\s+(.+)/.exec(line);
		if (heading) {
			flushList();
			const level = Math.min(heading[1].length, 6);
			html.push(`<h${level}>${applyInlineFormatting(heading[2])}</h${level}>`);
			continue;
		}

		const bullet = /^\s*[-*+]\s+(.+)/.exec(line);
		if (bullet) {
			const taskMatch = /^\[( |x|X)\]\s*(.*)/.exec(bullet[1]);
			if (taskMatch) {
				const status = taskMatch[1].toLowerCase() === "x" ? "done" : "todo";
				const label = applyInlineFormatting(taskMatch[2] || "");
				listItems.push(
					`<li data-task="${status}"><span class="task-icon" aria-hidden="true">${status === "done" ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9 12l2 2 4-4"></path></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>'}</span><span class="task-text">${label}</span></li>`,
				);
				listHasTasks = true;
				continue;
			}

			listItems.push(`<li>${applyInlineFormatting(bullet[1])}</li>`);
			continue;
		}

		flushList();
		if (line.trim().length === 0) {
			html.push('<div class="md-gap"></div>');
			continue;
		}

		html.push(`<p>${applyInlineFormatting(line)}</p>`);
	}

	flushList();
	return html.join("\n");
}

export function renderPlainText(content) {
	return escapeHtml(content ?? "").replace(/\r?\n/g, "<br />");
}

export function isMarkdownPath(path) {
	if (!path) return true;
	const lower = path.toLowerCase();
	return [".md", ".markdown", ".mdown", ".mkd", ".mkdn"].some((ext) =>
		lower.endsWith(ext),
	);
}
