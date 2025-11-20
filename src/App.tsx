import { invoke } from "@tauri-apps/api/core";
import {
	Bold,
	Eye,
	EyeOff,
	FolderOpen,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6,
	Italic,
	List,
	Strikethrough,
	Underline,
	Save,
	Wand2,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { isMarkdownPath, renderMarkdown, renderPlainText } from "@/lib/markdown.js";
import "./App.css";

type RemoteFile = {
	content: string;
	path: string;
	is_markdown: boolean;
};

type UiStatus = "idle" | "loading" | "saving" | "ready" | "error";

function App() {
	const editorRef = useRef<HTMLTextAreaElement>(null);
	const [content, setContent] = useState("");
	const [filePath, setFilePath] = useState<string | null>(null);
	const [isMarkdown, setIsMarkdown] = useState(true);
	const [previewEnabled, setPreviewEnabled] = useState(true);
	const [status, setStatus] = useState<UiStatus>("idle");
	const [message, setMessage] = useState<string | null>(null);
	const [startupMs, setStartupMs] = useState<number | null>(null);
	const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

	useEffect(() => {
		const bootstrap = async () => {
			try {
				const ms = await invoke<number>("mark_frontend_ready");
				setStartupMs(ms);
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
		() =>
			isMarkdown && previewEnabled
				? renderMarkdown(content)
				: renderPlainText(content),
		[content, isMarkdown, previewEnabled],
	);

	const applyFile = (file: RemoteFile) => {
		setContent(file.content);
		setFilePath(file.path);
		setIsMarkdown(file.is_markdown ?? isMarkdownPath(file.path));
		setStatus("ready");
		setMessage(null);
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

			const resolvedPath = Array.isArray(selection)
				? selection[0]
				: selection;

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
			setMessage("Saved");
			setLastSavedAt(new Date().toLocaleTimeString());
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
			content.slice(0, lineStart) +
			replacement +
			content.slice(resolvedEnd);

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

		const replacement = trimmed.startsWith("- ")
			? trimmed
			: `- ${trimmed}`;
		const nextValue =
			content.slice(0, lineStart) +
			replacement +
			content.slice(resolvedEnd);

		setContent(nextValue);
		requestAnimationFrame(() => {
			target.focus();
			const targetPos = lineStart + Math.min(replacement.length, cursor - lineStart + 2);
			target.selectionStart = targetPos;
			target.selectionEnd = targetPos;
		});
	};

	const handleShortcut = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (!(event.metaKey || event.ctrlKey)) return;
		const key = event.key.toLowerCase();

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

	const statusTone =
		status === "error"
			? "text-red-600 border-red-200 bg-red-50"
			: status === "saving" || status === "loading"
				? "text-amber-700 border-amber-200 bg-amber-50"
				: "text-emerald-700 border-emerald-200 bg-emerald-50";

	const fileLabel = filePath ? filePath : "Untitled";

	return (
		<main className="min-h-screen bg-app text-foreground">
			<div className="mx-auto flex max-w-6xl flex-col gap-6 p-6 md:p-10">
				<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1">
						<div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-semibold text-primary shadow-sm ring-1 ring-black/5 backdrop-blur">
							<Wand2 size={16} />
							LiteMD
						</div>
						<h1 className="text-3xl font-semibold tracking-tight text-primary">
							Fast, offline-first Markdown.
						</h1>
						<p className="text-sm text-muted-foreground">
							Open any text file, edit with shortcuts, and preview safely.
						</p>
					</div>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleOpenFile}
							className="action-btn"
							aria-label="Open file"
						>
							<FolderOpen size={18} />
							Open
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="action-btn primary"
							aria-label="Save file"
						>
							<Save size={18} />
							Save
						</button>
					</div>
				</header>

				<section className="space-y-3 rounded-2xl border border-border/60 bg-white/75 shadow-xl shadow-primary/5 backdrop-blur">
					<div className="flex flex-col gap-2 border-b border-border/70 px-5 py-4 md:flex-row md:items-center md:justify-between">
						<div className="space-y-1">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">
								Current file
							</p>
							<p className="text-sm font-medium text-primary">{fileLabel}</p>
						</div>
						<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							{startupMs !== null && (
								<span className="rounded-full bg-muted px-3 py-1 text-primary">
									Start: {startupMs}ms
								</span>
							)}
							{lastSavedAt && (
								<span className="rounded-full bg-muted px-3 py-1 text-primary">
									Saved at {lastSavedAt}
								</span>
							)}
							<span className={`rounded-full border px-3 py-1 ${statusTone}`}>
								{message ?? status}
							</span>
							<button
								type="button"
								onClick={() => setPreviewEnabled((prev) => !prev)}
								className="toggle-btn"
								aria-label="Toggle preview"
							>
								{previewEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
								{previewEnabled ? "Preview on" : "Preview off"}
							</button>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-5 py-3">
						<ToolbarButton label="Bold" icon={<Bold size={16} />} onClick={() => wrapSelection("**", "**")} />
						<ToolbarButton label="Italic" icon={<Italic size={16} />} onClick={() => wrapSelection("*", "*")} />
						<ToolbarButton label="Underline" icon={<Underline size={16} />} onClick={() => wrapSelection("++", "++")} />
						<ToolbarButton label="Strike" icon={<Strikethrough size={16} />} onClick={() => wrapSelection("~~", "~~")} />
						<span className="mx-1 h-5 w-px bg-border" aria-hidden />
						<ToolbarButton label="H1" icon={<Heading1 size={16} />} onClick={() => applyHeading(1)} />
						<ToolbarButton label="H2" icon={<Heading2 size={16} />} onClick={() => applyHeading(2)} />
						<ToolbarButton label="H3" icon={<Heading3 size={16} />} onClick={() => applyHeading(3)} />
						<ToolbarButton label="H4" icon={<Heading4 size={16} />} onClick={() => applyHeading(4)} />
						<ToolbarButton label="H5" icon={<Heading5 size={16} />} onClick={() => applyHeading(5)} />
						<ToolbarButton label="H6" icon={<Heading6 size={16} />} onClick={() => applyHeading(6)} />
						<span className="mx-1 h-5 w-px bg-border" aria-hidden />
						<ToolbarButton label="Bullet" icon={<List size={16} />} onClick={applyBullet} />
					</div>

					<div className="grid gap-4 px-5 pb-5 pt-2 md:grid-cols-2">
						<div className="flex flex-col gap-3">
							<label className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
								Editor
								<span className="rounded-full bg-muted px-2 py-1 text-[10px] text-primary">
									Shortcuts: Cmd/Ctrl + B / I / U / Shift+X / Option+1-6
								</span>
							</label>
							<textarea
								ref={editorRef}
								value={content}
								onChange={(event) => setContent(event.target.value)}
								onKeyDown={handleShortcut}
								className="editor-surface"
								placeholder="Start typing or open a file..."
							/>
						</div>

						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
								<span>{isMarkdown && previewEnabled ? "Preview" : "Plain text"}</span>
								<span className="rounded-full bg-muted px-2 py-1 text-[10px] text-primary">
									Updates instantly
								</span>
							</div>
							<div className="preview-surface" dangerouslySetInnerHTML={{ __html: previewHtml }} />
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}

function ToolbarButton({
	icon,
	label,
	onClick,
}: {
	icon: ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="toolbar-btn"
			aria-label={label}
		>
			{icon}
			<span className="hidden sm:inline">{label}</span>
		</button>
	);
}

function formatError(error: unknown, fallback: string) {
	if (typeof error === "string") return error;
	if (error && typeof error === "object" && "message" in error) {
		return String(error.message);
	}
	return fallback;
}

export default App;
