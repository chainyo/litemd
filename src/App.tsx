import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
	Bold,
	Eye,
	EyeOff,
	FileText,
	FolderOpen,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6,
	Italic,
	List,
	Moon,
	Save,
	Strikethrough,
	SunMedium,
	Underline,
} from "lucide-react";
import {
	type MutableRefObject,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
	isMarkdownPath,
	renderMarkdown,
	renderPlainText,
} from "@/lib/markdown.js";
import "./App.css";

type RemoteFile = {
	content: string;
	path: string;
	is_markdown: boolean;
};

type UiStatus = "idle" | "loading" | "saving" | "ready" | "error";

function App() {
	const editorRef = useRef<HTMLTextAreaElement>(null);
	const previewRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLDivElement>(null);
	const [content, setContent] = useState("");
	const [filePath, setFilePath] = useState<string | null>(null);
	const [isMarkdown, setIsMarkdown] = useState(true);
	const [previewEnabled, setPreviewEnabled] = useState(false);
	const [status, setStatus] = useState<UiStatus>("idle");
	const [message, setMessage] = useState<string | null>(null);
	const [theme, setTheme] = useState<"light" | "dark">(() => {
		if (typeof window === "undefined") return "light";
		const stored = window.localStorage.getItem("theme");
		if (stored === "dark" || stored === "light") return stored;
		return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
			? "dark"
			: "light";
	});
	const [modKey, setModKey] = useState<"⌘" | "Ctrl">("Ctrl");
	const charWidthRef = useRef<Map<string, number>>(new Map());
	const textMeasureRef = useRef<CanvasRenderingContext2D | null>(null);
	const caretPos = useRef<{ top: number; left: number }>({ top: 0, left: 0 });

	useEffect(() => {
		const bootstrap = async () => {
			try {
				await invoke<number>("mark_frontend_ready");
			} catch {
				// ignore instrumentation errors in dev
			}

			try {
				const initial = await invoke<RemoteFile | null>("initial_file");
				if (initial && typeof initial.content === "string") {
					applyFile(initial);
					return;
				}
			} catch (error) {
				setMessage(formatError(error, "Unable to load initial file"));
			}

			setStatus("ready");
		};

		void bootstrap();
	}, []);

	const previewHtml = useMemo(
		() => (isMarkdown ? renderMarkdown(content) : renderPlainText(content)),
		[content, isMarkdown],
	);
	const previewVisible = isMarkdown && previewEnabled;
	const showError = status === "error" && message;

	useEffect(() => {
		if (typeof navigator !== "undefined") {
			setModKey(/mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl");
		}
	}, []);

	const applyFile = (file: RemoteFile) => {
		setContent(file.content);
		setFilePath(file.path);
		setIsMarkdown(file.is_markdown ?? isMarkdownPath(file.path));
		setPreviewEnabled(false);
		setStatus("ready");
		setMessage(null);
	};

	const exitPreviewToEdit = () => {
		if (!previewVisible) return;
		setPreviewEnabled(false);
		requestAnimationFrame(() => {
			editorRef.current?.focus();
		});
	};

	const handleOpenFile = async () => {
		setStatus("loading");
		try {
			const selection = await open({
				multiple: false,
				filters: [
					{
						name: "LiteMD files",
						extensions: ["md", "markdown", "txt"],
					},
				],
			});

			const resolvedPath = Array.isArray(selection) ? selection[0] : selection;

			if (!resolvedPath) {
				setStatus("ready");
				return;
			}

			const file = await invoke<RemoteFile>("open_file", {
				path: resolvedPath,
			});
			applyFile(file);
		} catch (error) {
			setStatus("error");
			setMessage(formatError(error, "Unable to open file"));
		}
	};

	const handleSave = async () => {
		setStatus("saving");
		try {
			await invoke("save_file", { contents: content });
			setStatus("ready");
			setMessage(null);
		} catch (error) {
			setStatus("error");
			setMessage(formatError(error, "Unable to save file"));
		}
	};

	const wrapSelection = (prefix: string, suffix?: string) => {
		const target = editorRef.current;
		if (!target) return;

		const start = target.selectionStart ?? 0;
		const end = target.selectionEnd ?? 0;
		const before = content.slice(0, start);
		const selected = content.slice(start, end);
		const afterText = content.slice(end);
		const closing = suffix ?? prefix;

		const nextValue = `${before}${prefix}${selected}${closing}${afterText}`;
		setContent(nextValue);

		const cursorStart = start + prefix.length;
		const cursorEnd = cursorStart + selected.length;
		requestAnimationFrame(() => {
			target.focus();
			target.selectionStart = cursorStart;
			target.selectionEnd = cursorEnd;
		});
	};

	const applyHeading = (level: number) => {
		const target = editorRef.current;
		if (!target) return;

		const cursor = target.selectionStart ?? 0;
		const lineStart = content.lastIndexOf("\n", cursor - 1) + 1;
		const lineEnd = content.indexOf("\n", cursor);
		const resolvedEnd = lineEnd === -1 ? content.length : lineEnd;
		const line = content.slice(lineStart, resolvedEnd);

		let trimmed = line.trimStart();
		while (trimmed.startsWith("#")) {
			trimmed = trimmed.slice(1).trimStart();
		}

		const replacement = `${"#".repeat(level)} ${trimmed}`.trimEnd();
		const nextValue =
			content.slice(0, lineStart) + replacement + content.slice(resolvedEnd);

		setContent(nextValue);
		requestAnimationFrame(() => {
			target.focus();
			const targetPos = lineStart + replacement.length;
			target.selectionStart = targetPos;
			target.selectionEnd = targetPos;
		});
	};

	const applyBullet = () => {
		const target = editorRef.current;
		if (!target) return;

		const cursor = target.selectionStart ?? 0;
		const lineStart = content.lastIndexOf("\n", cursor - 1) + 1;
		const lineEnd = content.indexOf("\n", cursor);
		const resolvedEnd = lineEnd === -1 ? content.length : lineEnd;
		const line = content.slice(lineStart, resolvedEnd);
		const trimmed = line.trimStart();

		const replacement = trimmed.startsWith("- ") ? trimmed : `- ${trimmed}`;
		const nextValue =
			content.slice(0, lineStart) + replacement + content.slice(resolvedEnd);

		setContent(nextValue);
		requestAnimationFrame(() => {
			target.focus();
			const targetPos =
				lineStart + Math.min(replacement.length, cursor - lineStart + 2);
			target.selectionStart = targetPos;
			target.selectionEnd = targetPos;
		});
	};

	const handleShortcut = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (!(event.metaKey || event.ctrlKey)) return;
		const key = event.key.toLowerCase();

		if (previewVisible) {
			const editingShortcut =
				key === "b" ||
				key === "i" ||
				key === "u" ||
				(key === "x" && event.shiftKey) ||
				(key === "8" && event.shiftKey) ||
				(event.altKey && ["1", "2", "3", "4", "5", "6"].includes(key));
			if (editingShortcut) {
				event.preventDefault();
				exitPreviewToEdit();
			}
			return;
		}

		if (key === "b") {
			event.preventDefault();
			wrapSelection("**", "**");
		} else if (key === "i") {
			event.preventDefault();
			wrapSelection("*", "*");
		} else if (key === "u") {
			event.preventDefault();
			wrapSelection("++", "++");
		} else if (key === "x" && event.shiftKey) {
			event.preventDefault();
			wrapSelection("~~", "~~");
		} else if (key === "8" && event.shiftKey) {
			event.preventDefault();
			applyBullet();
		} else if (["1", "2", "3", "4", "5", "6"].includes(key) && event.altKey) {
			event.preventDefault();
			applyHeading(Number(key));
		}
	};

	const syncPreviewScroll = () => {
		const editor = editorRef.current;
		const preview = previewRef.current;
		if (!editor || !preview) return;

		const editorScrollable = editor.scrollHeight - editor.clientHeight;
		const previewScrollable = preview.scrollHeight - preview.clientHeight;
		const ratio =
			editorScrollable > 0 ? editor.scrollTop / editorScrollable : 0;
		preview.scrollTop = ratio * previewScrollable;
	};

	const updateCaretOverlay = () => {
		if (!previewVisible) return;
		const editor = editorRef.current;
		const canvas = canvasRef.current;
		if (!editor || !canvas) return;

		const text = editor.value ?? content;
		const selection = Math.min(editor.selectionStart ?? 0, text.length);
		const lineStart = text.lastIndexOf("\n", selection - 1) + 1;
		const lineEnd = text.indexOf("\n", selection);
		const resolvedEnd = lineEnd === -1 ? text.length : lineEnd;
		const rawLine = text.slice(lineStart, selection);
		const leading = text.slice(lineStart, resolvedEnd) ?? "";

		const styles = getComputedStyle(editor);
		const lineHeight = parseFloat(styles.lineHeight || "20");
		const paddingTop = parseFloat(styles.paddingTop || "0");
		const paddingLeft = parseFloat(styles.paddingLeft || "0");
		const scrollTop = editor.scrollTop ?? 0;
		const baseFontSize = parseFloat(styles.fontSize || "16");
		const headingMatch = /^#{1,6}\s+/.exec(leading);
		const headingLevel = headingMatch?.[1]?.length ?? null;
		const fontSizePx =
			headingLevel !== null ? baseFontSize * 1.05 : baseFontSize;
		const fontSize = `${fontSizePx}px`;
		const baseWeight = Number.parseFloat(styles.fontWeight) || 400;
		const fontWeight = headingLevel !== null ? 700 : baseWeight;
		const listIndent = /^\s*[-*+]\s+/.test(leading)
			? baseFontSize * 1.25
			: 0;
		const blocklessPrefix = rawLine
			.replace(/^#{1,6}\s+/, "")
			.replace(/^\s*[-*+]\s+/, "");
		const textWidth = measureMarkdownWidth(
			blocklessPrefix,
			styles.fontFamily,
			fontSize,
			fontWeight,
			headingLevel,
			charWidthRef,
			textMeasureRef,
		);

		const lineIndex = text.slice(0, lineStart).split("\n").length - 1;
		const top = paddingTop + lineIndex * lineHeight - scrollTop;
		const left =
			paddingLeft +
			listIndent +
			textWidth -
			(editor.scrollLeft ?? 0);

		caretPos.current = { top, left };

		// Keep overlay sized to line height
		const caretEl = canvas.querySelector<HTMLElement>(".caret-overlay");
		if (caretEl) {
			caretEl.style.height = `${lineHeight}px`;
		}

		// Ensure preview scroll follows caret line roughly
		if (previewVisible && previewRef.current) {
			const preview = previewRef.current;
			const caretBottom = top + lineHeight;
			if (caretBottom > preview.clientHeight + preview.scrollTop) {
				preview.scrollTop = caretBottom - preview.clientHeight;
			} else if (top < preview.scrollTop) {
				preview.scrollTop = top;
			}
		}
	};

	useEffect(() => {
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}

		if (typeof window !== "undefined") {
			try {
				window.localStorage.setItem("theme", theme);
			} catch {
				// ignore storage write failures
			}
		}
	}, [theme]);

	useEffect(() => {
		if (typeof navigator !== "undefined") {
			setModKey(/mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl");
		}
	}, []);

	useEffect(() => {
		if (!previewVisible) return;
		const editor = editorRef.current;
		if (!editor) return;

		const syncScroll = () => {
			syncPreviewScroll();
		};
		editor.addEventListener("scroll", syncScroll);
		return () => {
			editor.removeEventListener("scroll", syncScroll);
		};
	}, [previewVisible]);

	useEffect(() => {
		if (!previewVisible) return;
		syncPreviewScroll();
	}, [previewHtml, previewVisible]);

	useEffect(() => {
		if (!previewVisible) return;
		updateCaretOverlay();
	});

	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			const isMod = event.metaKey || event.ctrlKey;
			if (!isMod) return;
			const key = event.key.toLowerCase();
			if (["s", "o", "m", "t"].includes(key)) {
				event.preventDefault();
				if (key === "s") {
					void handleSave();
				} else if (key === "o") {
					void handleOpenFile();
				} else if (key === "m") {
					setPreviewEnabled((prev) => !prev);
				} else if (key === "t") {
					setTheme((prev) => (prev === "dark" ? "light" : "dark"));
				}
			}
		};

		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	const fileLabel = filePath ? filePath : "Untitled";

	return (
		<main className="app-shell">
			<header className="topbar">
				<div className="topbar-left">
					<div className="file-context" title={fileLabel}>
						<FileText size={16} />
						<span className="file-path">{fileLabel}</span>
					</div>
				</div>
				<div className="topbar-actions">
					<IconButton
						icon={<FolderOpen size={16} />}
						label="Open file"
						onClick={handleOpenFile}
						shortcut={[modKey, "O"]}
					/>
					<IconButton
						icon={<Save size={16} />}
						label="Save file"
						onClick={handleSave}
						shortcut={[modKey, "S"]}
					/>
					<IconButton
						icon={previewEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
						label={previewEnabled ? "Preview on" : "Preview off"}
						active={previewEnabled}
						onClick={() => setPreviewEnabled((prev) => !prev)}
						shortcut={[modKey, "M"]}
					/>
					<IconButton
						icon={
							theme === "dark" ? <SunMedium size={16} /> : <Moon size={16} />
						}
						label="Toggle theme"
						active={theme === "dark"}
						onClick={() =>
							setTheme((prev) => (prev === "dark" ? "light" : "dark"))
						}
						shortcut={[modKey, "T"]}
					/>
				</div>
			</header>

			{showError && (
				<div className="inline-alert" role="status">
					{message}
				</div>
			)}

			<aside className="format-rail" aria-label="Formatting toolbar">
				<IconButton
					icon={<Bold size={16} />}
					label="Bold"
					onClick={() => wrapSelection("**", "**")}
				/>
				<IconButton
					icon={<Italic size={16} />}
					label="Italic"
					onClick={() => wrapSelection("*", "*")}
				/>
				<IconButton
					icon={<Underline size={16} />}
					label="Underline"
					onClick={() => wrapSelection("++", "++")}
				/>
				<IconButton
					icon={<Strikethrough size={16} />}
					label="Strike"
					onClick={() => wrapSelection("~~", "~~")}
				/>
				<span className="rail-divider" aria-hidden />
				<IconButton
					icon={<Heading1 size={16} />}
					label="Heading 1"
					onClick={() => applyHeading(1)}
				/>
				<IconButton
					icon={<Heading2 size={16} />}
					label="Heading 2"
					onClick={() => applyHeading(2)}
				/>
				<IconButton
					icon={<Heading3 size={16} />}
					label="Heading 3"
					onClick={() => applyHeading(3)}
				/>
				<IconButton
					icon={<Heading4 size={16} />}
					label="Heading 4"
					onClick={() => applyHeading(4)}
				/>
				<IconButton
					icon={<Heading5 size={16} />}
					label="Heading 5"
					onClick={() => applyHeading(5)}
				/>
				<IconButton
					icon={<Heading6 size={16} />}
					label="Heading 6"
					onClick={() => applyHeading(6)}
				/>
				<span className="rail-divider" aria-hidden />
				<IconButton
					icon={<List size={16} />}
					label="Bullet list"
					onClick={applyBullet}
				/>
			</aside>

			<section className="workspace" aria-label="Editor surface">
				<div
					className={`editor-canvas ${previewVisible ? "is-preview" : ""}`}
					ref={canvasRef}
				>
					{previewVisible && (
						<div
							ref={previewRef}
							className="preview-layer editor-layer"
							dangerouslySetInnerHTML={{ __html: previewHtml }}
						/>
					)}
					<textarea
						ref={editorRef}
						value={content}
						readOnly={previewVisible}
						aria-readonly={previewVisible}
						onPointerDown={exitPreviewToEdit}
						onFocus={exitPreviewToEdit}
						onChange={(event) => {
							setContent(event.target.value);
							requestAnimationFrame(() => updateCaretOverlay());
						}}
						onKeyDown={handleShortcut}
						onKeyUp={updateCaretOverlay}
						onClick={() => {
							if (previewVisible) {
								exitPreviewToEdit();
								return;
							}
							updateCaretOverlay();
						}}
						onSelect={updateCaretOverlay}
						onScroll={updateCaretOverlay}
						className={`editor-input editor-layer ${previewVisible ? "preview-active" : ""}`}
						placeholder="Start typing or open a file..."
					/>
				</div>
			</section>
		</main>
	);
}

function IconButton({
	icon,
	label,
	onClick,
	active = false,
	shortcut,
	noActiveBorder = false,
}: {
	icon: ReactNode;
	label: string;
	onClick: () => void;
	active?: boolean;
	shortcut?: string[];
	noActiveBorder?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`icon-btn ${active ? "active" : ""} ${noActiveBorder ? "no-active-border" : ""}`}
			aria-label={label}
			title={label}
		>
			{icon}
			{shortcut?.length ? (
				<KbdGroup className="shortcut">
					{shortcut.map((key) => (
						<Kbd key={key}>{key}</Kbd>
					))}
				</KbdGroup>
			) : null}
		</button>
	);
}

function measureChWidth(
	fontFamily: string,
	fontSize: string,
	cache: MutableRefObject<Map<string, number>>,
) {
	const key = `${fontFamily}|${fontSize}`;
	const existing = cache.current.get(key);
	if (existing) return existing;
	const span = document.createElement("span");
	span.textContent = "0";
	span.style.position = "absolute";
	span.style.visibility = "hidden";
	span.style.fontFamily = fontFamily;
	span.style.fontSize = fontSize;
	span.style.whiteSpace = "pre";
	document.body.append(span);
	const width = span.getBoundingClientRect().width || 8;
	span.remove();
	cache.current.set(key, width);
	return width;
}

function measureTextWidth(
	text: string,
	fontFamily: string,
	fontSize: string,
	fontWeight: string,
	charCache: MutableRefObject<Map<string, number>>,
	ctxRef: MutableRefObject<CanvasRenderingContext2D | null>,
) {
	const fallback =
		(text?.length ?? 0) * measureChWidth(fontFamily, fontSize, charCache);

	try {
		if (!ctxRef.current) {
			const canvas = document.createElement("canvas");
			ctxRef.current = canvas.getContext("2d");
		}

		const ctx = ctxRef.current;
		if (!ctx) return fallback;

		ctx.font = `${fontWeight} ${fontSize} ${fontFamily || "monospace"}`;
		const measured = ctx.measureText(text ?? "");
		return measured?.width || fallback;
	} catch {
		return fallback;
	}
}

function measureMarkdownWidth(
	text: string,
	fontFamily: string,
	fontSize: string,
	baseWeight: number,
	headingLevel: number | null,
	charCache: MutableRefObject<Map<string, number>>,
	ctxRef: MutableRefObject<CanvasRenderingContext2D | null>,
) {
	if (!text) return 0;

	const consumeMarker = (marker: string, at: number) =>
		text.startsWith(marker, at) ? marker.length : 0;

	let width = 0;
	let cursor = 0;
	let bold = false;

	while (cursor < text.length) {
		const markerLen =
			consumeMarker("**", cursor) ||
			consumeMarker("__", cursor) ||
			consumeMarker("++", cursor) ||
			consumeMarker("~~", cursor);

		if (markerLen) {
			if (markerLen === 2 && (text[cursor] === "*" || text[cursor] === "_")) {
				bold = !bold;
			}
			cursor += markerLen;
			continue;
		}

		const start = cursor;
		while (cursor < text.length) {
			const ahead =
				consumeMarker("**", cursor) ||
				consumeMarker("__", cursor) ||
				consumeMarker("++", cursor) ||
				consumeMarker("~~", cursor);
			if (ahead) break;
			cursor += 1;
		}

		const segment = text.slice(start, cursor);
		if (segment.length) {
			const weight = headingLevel !== null || bold ? 700 : baseWeight;
			width += measureTextWidth(
				segment,
				fontFamily,
				fontSize,
				String(weight),
				charCache,
				ctxRef,
			);
		}
	}

	return width;
}

function formatError(error: unknown, fallback: string) {
	if (typeof error === "string") return error;
	if (error && typeof error === "object" && "message" in error) {
		return String(error.message);
	}
	return fallback;
}

export default App;
