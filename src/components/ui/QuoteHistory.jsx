import { useMemo, useState } from "react";
import { BLUE, GRAY, BLACK, WHITE, BORD, os, mont } from "../../theme/tokens";

// Historial de cotizaciones compartido por canal.
// columns: [{ label, get:(q)=>string|number }]  · resumen para la tabla.
export function QuoteHistory({ quotes, loading, channel, columns, onEdit, onDelete, csvName }) {
	const [month, setMonth] = useState("all");

	const own = useMemo(function () {
		return quotes.filter(function (q) { return q.channel === channel; });
	}, [quotes, channel]);

	const months = useMemo(function () {
		const set = new Set(own.map(function (q) { return q.fecha.slice(0, 7); }));
		return Array.from(set).sort().reverse();
	}, [own]);

	const filtered = useMemo(function () {
		if (month === "all") return own;
		return own.filter(function (q) { return q.fecha.slice(0, 7) === month; });
	}, [own, month]);

	function exportCsv() {
		const header = ["fecha", "cliente"].concat(columns.map(function (c) { return c.label; }));
		const rows = filtered.map(function (q) {
			return [q.fecha.slice(0, 10), '"' + (q.clientName || "").replace(/"/g, '""') + '"']
				.concat(columns.map(function (c) {
					const v = c.get(q);
					return typeof v === "string" ? '"' + v.replace(/"/g, '""') + '"' : v;
				})).join(",");
		});
		const csv = header.join(",") + "\n" + rows.join("\n");
		const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = (csvName || "cotizaciones") + (month === "all" ? "" : "-" + month) + ".csv";
		a.click();
		URL.revokeObjectURL(a.href);
	}

	const th = Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", padding: "8px 10px", textAlign: "right", borderBottom: "1px solid " + BORD });
	const thl = Object.assign({}, th, { textAlign: "left" });
	const td = Object.assign({}, os(12, 400, BLACK), { padding: "9px 10px", textAlign: "right", borderBottom: "1px solid " + BORD });
	const tdl = Object.assign({}, td, { textAlign: "left", fontWeight: 700 });

	return (
		<div style={{ marginTop: 28 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
				<span style={mont(13)}>Historial de cotizaciones</span>
				<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
					{months.length > 0 && (
						<select value={month} onChange={function (e) { setMonth(e.target.value); }} style={{ padding: "5px 8px", border: "1px solid " + BORD, borderRadius: 6, fontFamily: "'Open Sans',sans-serif", fontSize: 12, color: BLACK, background: WHITE }}>
							<option value="all">Todos los meses</option>
							{months.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
						</select>
					)}
					{filtered.length > 0 && (
						<button onClick={exportCsv} style={{ padding: "5px 12px", background: WHITE, color: BLUE, border: "1px solid " + BLUE, borderRadius: 6, cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700 }}>Exportar CSV</button>
					)}
				</div>
			</div>

			{loading ? (
				<p style={os(12, 400, GRAY)}>Cargando historial…</p>
			) : own.length === 0 ? (
				<p style={Object.assign({}, os(12, 400, GRAY), { padding: "16px 0" })}>
					Todavía no hay cotizaciones guardadas en este canal. Cargá un cliente y tocá <strong>Guardar cotización</strong>.
				</p>
			) : (
				<div style={{ overflowX: "auto", border: "1px solid " + BORD, borderRadius: 10, background: WHITE }}>
					<table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
						<thead>
							<tr>
								<th style={thl}>Fecha</th>
								<th style={thl}>Cliente</th>
								{columns.map(function (c) { return <th key={c.label} style={th}>{c.label}</th>; })}
								<th style={th}></th>
							</tr>
						</thead>
						<tbody>
							{filtered.map(function (q) {
								return (
									<tr key={q.id}>
										<td style={td}>{q.fecha.slice(0, 10)}{q.updatedAt && <span style={Object.assign({}, os(9, 400, GRAY), { display: "block" })}>editada</span>}</td>
										<td style={tdl}>{q.clientName || "(sin nombre)"}</td>
										{columns.map(function (c) { return <td key={c.label} style={td}>{c.get(q)}</td>; })}
										<td style={Object.assign({}, td, { whiteSpace: "nowrap" })}>
											<button onClick={function () { onEdit(q); }} title="Editar esta cotización" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "0 6px", color: BLUE }}>✎</button>
											<button onClick={function () { if (window.confirm("¿Borrar la cotización de " + (q.clientName || "(sin nombre)") + "?")) onDelete(q.id); }} title="Borrar" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "0 6px", color: GRAY }}>🗑</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
			<p style={Object.assign({}, os(10, 400, GRAY), { marginTop: 8 })}>Sincronizado vía Supabase, visible para todo el equipo. ✎ reabre la cotización para editar; al guardar actualiza ese registro.</p>
		</div>
	);
}

// Barra de guardado: nombre de cliente + botón guardar/actualizar.
export function SaveQuoteBar({ clientName, setClientName, onSave, canSave, editingId, onCancelEdit, flash }) {
	return (
		<div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 18, padding: "12px 14px", background: editingId ? "#f0fdf4" : "#f8fafc", border: "1px solid " + BORD, borderRadius: 10 }}>
			<div style={{ flex: "1 1 220px", minWidth: 180 }}>
				<label style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 })}>Nombre del cliente {editingId && <span style={os(10, 700, "#16a34a")}>· editando</span>}</label>
				<input type="text" placeholder="Ej: Banco XYZ S.A." value={clientName} onChange={function (e) { setClientName(e.target.value); }} style={{ width: "100%", border: "1px solid " + BORD, borderRadius: 6, padding: "8px 10px", fontFamily: "'Open Sans',sans-serif", fontSize: 13, color: BLACK, background: WHITE, outline: "none", boxSizing: "border-box" }} />
			</div>
			{editingId && (
				<button onClick={onCancelEdit} style={{ padding: "9px 14px", background: WHITE, color: GRAY, border: "1px solid " + BORD, borderRadius: 6, cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 12 }}>Cancelar</button>
			)}
			<button onClick={onSave} disabled={!canSave} style={{ padding: "9px 18px", background: flash ? "#16a34a" : (canSave ? BLUE : "#cbd5e1"), color: WHITE, border: "none", borderRadius: 6, cursor: canSave ? "pointer" : "not-allowed", fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700 }}>
				{flash ? "✓ Guardada" : editingId ? "Actualizar" : "Guardar cotización"}
			</button>
		</div>
	);
}
