import { useMemo } from "react";
import docMd from "../../../docs/modelo-comercial.md?raw";

// ─── Documentación del modelo comercial dentro de la app ──────────────────────
// Renderiza docs/modelo-comercial.md (importada como texto crudo con ?raw). La doc la
// genera scripts/gen-pricing-docs.mjs desde la config viva de Supabase, así que esta
// pantalla muestra siempre el modelo comercial vigente sin duplicar los números.
//
// Renderer de markdown propio (sin dependencias): cubre el subconjunto que usa la doc
// —headings, tablas GFM, bold, `code`, blockquote, listas (→ y -), hr y párrafos—.
// Los comentarios HTML de los marcadores AUTO se descartan.

// Inline: **negrita** y `código`. Devuelve un array de nodos React.
function renderInline(text, keyBase) {
	const nodes = [];
	const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
	let last = 0;
	let m;
	let i = 0;
	while ((m = re.exec(text)) !== null) {
		if (m.index > last) nodes.push(text.slice(last, m.index));
		if (m[1] != null) nodes.push(<strong key={`${keyBase}-b${i}`}>{m[1]}</strong>);
		else nodes.push(<code key={`${keyBase}-c${i}`} className="doc-code">{m[2]}</code>);
		last = re.lastIndex;
		i++;
	}
	if (last < text.length) nodes.push(text.slice(last));
	return nodes;
}

function splitRow(line) {
	let s = line.trim();
	if (s.startsWith("|")) s = s.slice(1);
	if (s.endsWith("|")) s = s.slice(0, -1);
	return s.split("|").map(function (c) { return c.trim(); });
}
function isTableSep(line) {
	return /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes("-");
}

function parseMarkdown(md) {
	// Quita los comentarios HTML (marcadores AUTO) sin romper el resto.
	const clean = md.replace(/<!--[\s\S]*?-->/g, "");
	const lines = clean.split("\n");
	const blocks = [];
	let i = 0;
	let para = [];
	let quote = [];
	let list = [];

	function flushPara() { if (para.length) { blocks.push({ type: "p", text: para.join(" ") }); para = []; } }
	function flushQuote() { if (quote.length) { blocks.push({ type: "quote", text: quote.join(" ") }); quote = []; } }
	function flushList() { if (list.length) { blocks.push({ type: "list", items: list.slice() }); list = []; } }
	function flushAll() { flushPara(); flushQuote(); flushList(); }

	while (i < lines.length) {
		const line = lines[i];
		const t = line.trim();

		if (t === "") { flushAll(); i++; continue; }
		if (/^---+$/.test(t)) { flushAll(); blocks.push({ type: "hr" }); i++; continue; }

		const h = t.match(/^(#{1,4})\s+(.*)$/);
		if (h) { flushAll(); blocks.push({ type: "h", level: h[1].length, text: h[2] }); i++; continue; }

		// Tabla: fila con | seguida de una fila separadora.
		if (t.startsWith("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
			flushAll();
			const header = splitRow(t);
			i += 2;
			const rows = [];
			while (i < lines.length && lines[i].trim().startsWith("|")) {
				rows.push(splitRow(lines[i]));
				i++;
			}
			blocks.push({ type: "table", header: header, rows: rows });
			continue;
		}

		if (t.startsWith(">")) { flushPara(); flushList(); quote.push(t.replace(/^>\s?/, "")); i++; continue; }

		if (t.startsWith("→ ") || t.startsWith("- ") || t.startsWith("· ")) {
			flushPara(); flushQuote();
			list.push(t.replace(/^([→\-·])\s+/, ""));
			i++;
			continue;
		}

		para.push(t);
		i++;
	}
	flushAll();
	return blocks;
}

export function TabDocumentacion() {
	const blocks = useMemo(function () { return parseMarkdown(docMd); }, []);

	return (
		<div className="doc-wrap">
			{blocks.map(function (b, idx) {
				const key = "b" + idx;
				if (b.type === "hr") return <hr key={key} className="doc-hr" />;
				if (b.type === "h") {
					const Tag = "h" + Math.min(b.level, 4);
					return <Tag key={key} className={"doc-h doc-h" + b.level}>{renderInline(b.text, key)}</Tag>;
				}
				if (b.type === "p") return <p key={key} className="doc-p">{renderInline(b.text, key)}</p>;
				if (b.type === "quote") return <blockquote key={key} className="doc-quote">{renderInline(b.text, key)}</blockquote>;
				if (b.type === "list") {
					return (
						<ul key={key} className="doc-list">
							{b.items.map(function (it, j) { return <li key={key + "-" + j}>{renderInline(it, key + "-" + j)}</li>; })}
						</ul>
					);
				}
				if (b.type === "table") {
					return (
						<div key={key} className="doc-table-wrap">
							<table className="doc-table">
								<thead>
									<tr>{b.header.map(function (c, j) { return <th key={j}>{renderInline(c, key + "-h" + j)}</th>; })}</tr>
								</thead>
								<tbody>
									{b.rows.map(function (row, r) {
										return (
											<tr key={key + "-r" + r}>
												{row.map(function (c, j) { return <td key={j}>{renderInline(c, key + "-r" + r + "c" + j)}</td>; })}
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					);
				}
				return null;
			})}
		</div>
	);
}
