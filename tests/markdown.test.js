import assert from "node:assert/strict";
import test from "node:test";

import {
	isMarkdownPath,
	renderMarkdown,
	renderPlainText,
} from "../src/lib/markdown.js";

test("renders headings and emphasis", () => {
	const html = renderMarkdown("# Title\n\n**bold** *light*");
	assert.match(html, /<h1>Title<\/h1>/);
	assert.match(html, /<strong>bold<\/strong>/);
	assert.match(html, /<em>light<\/em>/);
});

test("sanitizes script injection in markdown preview", () => {
	const html = renderMarkdown("# Hi\n<script>alert('x')</script>");
	assert.doesNotMatch(html, /<script>/);
	assert.match(html, /&lt;script&gt;alert/);
});

test("plain text preview stays unrendered", () => {
	const html = renderPlainText("<b>raw</b>\nnext");
	assert.match(html, /&lt;b&gt;raw&lt;\/b&gt;/);
	assert.match(html, /<br \/>/);
});

test("detects markdown file extensions", () => {
	assert.equal(isMarkdownPath("/notes/today.md"), true);
	assert.equal(isMarkdownPath("/documents/plain.txt"), false);
	assert.equal(isMarkdownPath(null), true);
});
