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

	const flushList = () => {
		if (!listItems.length) return;
		html.push(`<ul>${listItems.join("")}</ul>`);
		listItems.length = 0;
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
