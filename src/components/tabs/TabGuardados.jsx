import { useState } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, WN, WNBG, ER, ERBG, os, mont } from "../../theme/tokens";
import { useModels } from "../../context/ModelsContext";
import { NumInput } from "../ui/NumInput";

const ARCH_OPTIONS = [
	{ k: "bolsa", label: "Bolsa prepaga" },
	{ k: "sub", label: "Suscripción mensual" },
	{ k: "anual", label: "Anual" },
	{ k: "ppu", label: "Pay-per-use" },
	{ k: "free", label: "Freemium" },
	{ k: "hibrido", label: "Híbrido" },
];

const SEGMENT_OPTIONS = [
	{ k: "persona", label: "Persona" },
	{ k: "empresa", label: "Empresa" },
];

const PRESET_COLORS = [
	"#3041d5", "#0891b2", "#7c3aed", "#b45309",
	"#059669", "#dc2626", "#64748b", "#c026d3",
];

const EMPTY_MODEL = {
	id: "",
	label: "Nuevo modelo",
	segment: "persona",
	color: "#3041d5",
	tagline: "",
	recommended: false,
	priceUSD: 50,
	firmas: 50,
	ilimitadas: false,
	certs: 1,
	admins: null,
	vigencia: 24,
	arch: "bolsa",
	billingPeriod: 1,
	extraFirmaPrice: 1.5,
	services: { cloudStorage: false, mailCert: false, paywall: false },
	priceNote: "Pago único · vigencia 2 años",
	benefits: [],
	cta: "Contratar",
};

function FieldRow({ label, children }) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
			<div style={Object.assign({}, os(11, 400, GRAY), { width: 130, flexShrink: 0 })}>{label}</div>
			<div style={{ flex: 1 }}>{children}</div>
		</div>
	);
}

function TextInput({ value, onChange, placeholder }) {
	return (
		<input
			type="text"
			value={value}
			placeholder={placeholder || ""}
			onChange={function (e) { onChange(e.target.value); }}
			style={{
				width: "100%",
				padding: "5px 8px",
				border: "1.5px solid " + BORD,
				borderRadius: 7,
				fontFamily: "'Open Sans',sans-serif",
				fontSize: 12,
				color: BLACK,
				boxSizing: "border-box",
			}}
		/>
	);
}

function ModelEditor({ model, onSave, onCancel, isNew, currency, tc }) {
	const [draft, setDraft] = useState(model);
	const isARS = currency === "ARS";

	function upd(key, val) {
		setDraft(function (prev) { return Object.assign({}, prev, { [key]: val }); });
	}
	function updSvc(key, val) {
		setDraft(function (prev) {
			return Object.assign({}, prev, {
				services: Object.assign({}, prev.services, { [key]: val }),
			});
		});
	}

	// priceTruth tracks the value as entered by the user (in whichever currency they chose).
	// When TC changes, the entered value stays fixed and only the conversion hint updates.
	const [priceTruth, setPriceTruth] = useState({ value: model.priceUSD || 0, currency: "USD" });
	const [firmaExtraTruth, setFirmaExtraTruth] = useState({ value: model.extraFirmaPrice || 0, currency: "USD" });

	function updPrecio(val) {
		setPriceTruth({ value: val || 0, currency: isARS ? "ARS" : "USD" });
	}

	function updFirmaExtra(val) {
		setFirmaExtraTruth({ value: val || 0, currency: isARS ? "ARS" : "USD" });
	}

	// Display in current UI currency — no rounding artifacts from double conversion
	const precioDisplay = isARS
		? (priceTruth.currency === "ARS" ? priceTruth.value : Math.round((priceTruth.value || 0) * tc))
		: (priceTruth.currency === "USD" ? priceTruth.value : (tc > 0 ? Math.round((priceTruth.value || 0) / tc * 100) / 100 : 0));

	const firmaExtraDisplay = isARS
		? (firmaExtraTruth.currency === "ARS" ? firmaExtraTruth.value : Math.round((firmaExtraTruth.value || 0) * tc))
		: (firmaExtraTruth.currency === "USD" ? firmaExtraTruth.value : (tc > 0 ? Math.round((firmaExtraTruth.value || 0) / tc * 100) / 100 : 0));

	// Canonical USD values used when saving the model
	const derivedPriceUSD = priceTruth.currency === "USD"
		? (priceTruth.value || 0)
		: (tc > 0 ? Math.round((priceTruth.value || 0) / tc * 100) / 100 : 0);
	const derivedFirmaExtraUSD = firmaExtraTruth.currency === "USD"
		? (firmaExtraTruth.value || 0)
		: (tc > 0 ? Math.round((firmaExtraTruth.value || 0) / tc * 100) / 100 : 0);

	// Hint shown below the field (the other currency)
	const precioHintARS = priceTruth.currency === "ARS" ? priceTruth.value : Math.round((priceTruth.value || 0) * tc);
	const precioHintUSD = priceTruth.currency === "USD" ? (priceTruth.value || 0) : (tc > 0 ? (priceTruth.value || 0) / tc : 0);

	const isDirty = JSON.stringify(draft) !== JSON.stringify(model)
		|| derivedPriceUSD !== (model.priceUSD || 0)
		|| derivedFirmaExtraUSD !== (model.extraFirmaPrice || 0);

	const SectionTitle = function ({ text }) {
		return (
			<div style={Object.assign({}, os(10, 700, GRAY), {
				textTransform: "uppercase",
				letterSpacing: "0.5px",
				marginBottom: 10,
				paddingBottom: 6,
				borderBottom: "1px solid " + BORD,
			})}>
				{text}
			</div>
		);
	};

	return (
		<div style={{
			background: WHITE,
			border: "2px solid " + BLUE + "55",
			borderRadius: 12,
			overflow: "hidden",
			marginTop: 16,
		}}>
			{/* Editor header */}
			<div style={{
				background: BLUE,
				padding: "12px 20px",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
			}}>
				<div style={Object.assign({}, os(12, 700, WHITE))}>
					{isNew ? "Nuevo modelo" : "Editando: " + model.label}
				</div>
				<div style={{
					width: 14,
					height: 14,
					borderRadius: "50%",
					background: draft.color,
					border: "2px solid rgba(255,255,255,0.5)",
				}} />
			</div>

			<div style={{ padding: 20 }}>
				{/* 2-column grid for sections */}
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>

					{/* Col 1: Identidad + Display */}
					<div>
						<SectionTitle text="Identidad" />
						<FieldRow label="Nombre">
							<TextInput value={draft.label} onChange={function (v) { upd("label", v); }} />
						</FieldRow>
						<FieldRow label="Tagline">
							<TextInput value={draft.tagline} onChange={function (v) { upd("tagline", v); }} placeholder="Descripción corta" />
						</FieldRow>
						<FieldRow label="Segmento">
							<div style={{ display: "flex", gap: 6 }}>
								{SEGMENT_OPTIONS.map(function (s) {
									return (
										<button
											key={s.k}
											onClick={function () { upd("segment", s.k); }}
											style={{
												padding: "4px 12px",
												borderRadius: 6,
												border: "1.5px solid " + (draft.segment === s.k ? BLUE : BORD),
												background: draft.segment === s.k ? BLUE : WHITE,
												color: draft.segment === s.k ? WHITE : GRAY,
												fontFamily: "'Open Sans',sans-serif",
												fontSize: 11,
												fontWeight: 700,
												cursor: "pointer",
											}}
										>
											{s.label}
										</button>
									);
								})}
							</div>
						</FieldRow>
						<FieldRow label="Color">
							<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
								{PRESET_COLORS.map(function (c) {
									return (
										<button
											key={c}
											onClick={function () { upd("color", c); }}
											style={{
												width: 24,
												height: 24,
												borderRadius: "50%",
												background: c,
												border: draft.color === c ? "3px solid " + BLACK : "2px solid transparent",
												outline: draft.color === c ? "2px solid " + c + "66" : "none",
												cursor: "pointer",
											}}
										/>
									);
								})}
							</div>
						</FieldRow>

						<div style={{ marginTop: 20 }}>
							<SectionTitle text="Display" />
						</div>
						<FieldRow label="Nota de precio">
							<TextInput value={draft.priceNote} onChange={function (v) { upd("priceNote", v); }} />
						</FieldRow>
						<FieldRow label="CTA button">
							<TextInput value={draft.cta} onChange={function (v) { upd("cta", v); }} />
						</FieldRow>
						<FieldRow label="Recomendado">
							<label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
								<input type="checkbox" checked={draft.recommended} onChange={function (e) { upd("recommended", e.target.checked); }} />
								<span style={os(11, 400, GRAY)}>Mostrar badge "Recomendado"</span>
							</label>
						</FieldRow>
						<FieldRow label="Activo">
							<label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
								<input type="checkbox" checked={draft.activo !== false} onChange={function (e) { upd("activo", e.target.checked); }} />
								<span style={os(11, 400, GRAY)}>Visible en cotizadora y Canal Web</span>
							</label>
						</FieldRow>
					</div>

					{/* Col 2: Financiero + Pack + Servicios */}
					<div>
						<SectionTitle text="Financiero" />
						<FieldRow label="Arquitectura">
							<select
								value={draft.arch}
								onChange={function (e) { upd("arch", e.target.value); }}
								style={{
									padding: "5px 8px",
									border: "1.5px solid " + BORD,
									borderRadius: 7,
									fontFamily: "'Open Sans',sans-serif",
									fontSize: 12,
									color: BLACK,
									background: WHITE,
									width: "100%",
								}}
							>
								{ARCH_OPTIONS.map(function (a) {
									return <option key={a.k} value={a.k}>{a.label}</option>;
								})}
							</select>
						</FieldRow>
						<FieldRow label={"Precio s/IVA (" + (isARS ? "ARS" : "USD") + ")"}>
							<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
								<NumInput value={precioDisplay} onChange={updPrecio} prefix={isARS ? "$" : "USD"} />
								<span style={Object.assign({}, os(10, 400, GRAY))}>
									{isARS
										? ("≈ USD " + precioHintUSD.toFixed(2))
										: ("≈ $ " + precioHintARS.toLocaleString("es-AR") + " ARS")
									}
								</span>
							</div>
						</FieldRow>
						<FieldRow label="Vigencia">
							<NumInput value={draft.vigencia} onChange={function (v) { upd("vigencia", v); }} suffix="meses" />
						</FieldRow>
						{(draft.arch === "sub" || draft.arch === "anual") && (
							<FieldRow label="Período de cobro">
								<NumInput value={draft.billingPeriod} onChange={function (v) { upd("billingPeriod", v); }} suffix="meses" />
							</FieldRow>
						)}

						<div style={{ marginTop: 20 }}>
							<SectionTitle text="Contenido del pack" />
						</div>
						<FieldRow label="Certificados">
							<NumInput value={draft.certs} onChange={function (v) { upd("certs", v); }} suffix="cert" />
						</FieldRow>
						<FieldRow label="Firmas incluidas">
							<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
								<div style={{ flex: 1 }}>
									<NumInput
										value={draft.firmas}
										onChange={function (v) { upd("firmas", v); upd("ilimitadas", false); }}
										suffix="firmas"
									/>
								</div>
								<label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}>
									<input
										type="checkbox"
										checked={draft.ilimitadas}
										onChange={function (e) { upd("ilimitadas", e.target.checked); }}
									/>
									<span style={os(11, 400, GRAY)}>Ilimitadas</span>
								</label>
							</div>
						</FieldRow>
						<FieldRow label="Admins">
							<NumInput value={draft.admins || 0} onChange={function (v) { upd("admins", v || null); }} suffix="admin" />
						</FieldRow>
						<FieldRow label={"Firma adicional (" + (isARS ? "ARS" : "USD") + ")"}>
							<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
								<NumInput value={firmaExtraDisplay} onChange={updFirmaExtra} prefix={isARS ? "$" : "USD"} suffix="/ firma" />
								{firmaExtraDisplay > 0 && (
									<span style={Object.assign({}, os(10, 400, GRAY))}>
										{isARS
											? ("≈ USD " + (draft.extraFirmaPrice || 0).toFixed(2))
											: ("≈ $ " + (draft.firmaExtraARS || Math.round((draft.extraFirmaPrice || 0) * tc)).toLocaleString("es-AR") + " ARS")
										}
									</span>
								)}
							</div>
						</FieldRow>

						<div style={{ marginTop: 20 }}>
							<SectionTitle text="Servicios incluidos" />
						</div>
						{[
							{ k: "cloudStorage", label: "Almacenamiento en nube" },
							{ k: "mailCert", label: "Mail certificado" },
						].map(function (svc) {
							return (
								<FieldRow key={svc.k} label={svc.label}>
									<label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
										<input
											type="checkbox"
											checked={draft.services[svc.k] || false}
											onChange={function (e) { updSvc(svc.k, e.target.checked); }}
										/>
										<span style={os(11, 400, GRAY)}>{draft.services[svc.k] ? "Incluido" : "No incluido"}</span>
									</label>
								</FieldRow>
							);
						})}
					</div>
				</div>

				{/* Actions */}
				<div style={{
					display: "flex",
					gap: 8,
					marginTop: 20,
					paddingTop: 16,
					borderTop: "1px solid " + BORD,
					justifyContent: "flex-end",
				}}>
					<button
						onClick={onCancel}
						style={{
							padding: "8px 20px",
							border: "1.5px solid " + BORD,
							borderRadius: 7,
							background: WHITE,
							fontFamily: "'Open Sans',sans-serif",
							fontSize: 12,
							fontWeight: 700,
							color: GRAY,
							cursor: "pointer",
						}}
					>
						Cancelar
					</button>
					<button
						onClick={function () { onSave(Object.assign({}, draft, { priceUSD: derivedPriceUSD, extraFirmaPrice: derivedFirmaExtraUSD })); }}
						disabled={!isDirty && !isNew}
						style={{
							padding: "8px 20px",
							border: "none",
							borderRadius: 7,
							background: isDirty || isNew ? BLUE : BORD,
							fontFamily: "'Open Sans',sans-serif",
							fontSize: 12,
							fontWeight: 700,
							color: WHITE,
							cursor: isDirty || isNew ? "pointer" : "default",
						}}
					>
						{isNew ? "Crear modelo" : "Guardar cambios"}
					</button>
				</div>
			</div>
		</div>
	);
}

function ModelCard({ model, isSelected, isEditing, onSelect, onEdit, onDuplicate, onDelete }) {
	const [confirmDelete, setConfirmDelete] = useState(false);

	return (
		<div
			style={{
				border: "2px solid " + (isEditing ? BLUE : isSelected ? model.color : BORD),
				borderRadius: 12,
				overflow: "hidden",
				background: WHITE,
				boxShadow: isEditing ? "0 0 0 3px " + BLUE + "22" : "none",
			}}
		>
			{/* Header */}
			<div
				onClick={onSelect}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 12,
					padding: "12px 14px",
					cursor: "pointer",
					background: isSelected ? model.color + "0d" : WHITE,
				}}
			>
				<div style={{
					width: 10, height: 10, borderRadius: "50%",
					background: model.color, flexShrink: 0,
				}} />
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={os(13, 700, BLACK)}>{model.label}</div>
					<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 1 })}>
						{model.segment === "persona" ? "Persona" : "Empresa"} · {model.arch} · USD {model.priceUSD}
					</div>
				</div>
				<div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
					<span style={Object.assign({}, os(10, 700, GRAY), {
						background: "#f1f5f9",
						padding: "2px 7px",
						borderRadius: 10,
					})}>
						{model.ilimitadas ? "∞ firmas" : (model.firmas || 0).toLocaleString("es-AR") + " firmas"}
					</span>
					<span style={Object.assign({}, os(10, 700, GRAY), {
						background: "#f1f5f9",
						padding: "2px 7px",
						borderRadius: 10,
					})}>
						{model.certs} cert · {model.vigencia}m
					</span>
				</div>
			</div>

			{/* Actions */}
			<div style={{
				display: "flex",
				gap: 0,
				borderTop: "1px solid " + BORD,
				background: "#fafafa",
			}}>
				{[
					{ label: "Editar", action: onEdit },
					{ label: "Duplicar", action: onDuplicate },
				].map(function (btn) {
					return (
						<button
							key={btn.label}
							onClick={btn.action}
							style={{
								flex: 1,
								padding: "6px 0",
								background: "none",
								border: "none",
								borderRight: "1px solid " + BORD,
								fontFamily: "'Open Sans',sans-serif",
								fontSize: 11,
								fontWeight: 700,
								color: GRAY,
								cursor: "pointer",
							}}
						>
							{btn.label}
						</button>
					);
				})}
				{confirmDelete ? (
					<>
						<button
							onClick={function () { setConfirmDelete(false); }}
							style={{ flex: 1, padding: "6px 0", background: "none", border: "none", borderRight: "1px solid " + BORD, fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700, color: GRAY, cursor: "pointer" }}
						>
							Cancelar
						</button>
						<button
							onClick={onDelete}
							style={{ flex: 1, padding: "6px 0", background: ERBG, border: "none", fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700, color: ER, cursor: "pointer" }}
						>
							¿Confirmar?
						</button>
					</>
				) : (
					<button
						onClick={function () { setConfirmDelete(true); }}
						style={{ flex: 1, padding: "6px 0", background: "none", border: "none", fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700, color: ER, cursor: "pointer" }}
					>
						Eliminar
					</button>
				)}
			</div>
		</div>
	);
}

export function TabGuardados({ selectedId, onSelect, currency, tc }) {
	const { models, upsert, remove, duplicate, resetToDefaults, exportJSON, importJSON } = useModels();
	const [editingId, setEditingId] = useState(null); // null | "new" | model.id
	const [importError, setImportError] = useState(null);
	const [importSuccess, setImportSuccess] = useState(false);

	function handleSave(draft) {
		const model = editingId === "new"
			? Object.assign({}, draft, { id: "model_" + Date.now() })
			: draft;
		upsert(model);
		setEditingId(null);
		if (editingId === "new") onSelect(model.id);
	}

	function handleExport() {
		const blob = new Blob([exportJSON()], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "lakaut-modelos.json";
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleImportFile(e) {
		const file = e.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = function (ev) {
			const err = importJSON(ev.target.result);
			if (err) {
				setImportError(err);
				setImportSuccess(false);
			} else {
				setImportError(null);
				setImportSuccess(true);
				setTimeout(function () { setImportSuccess(false); }, 2500);
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	}

	return (
		<div>
			{/* Toolbar */}
			<div style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				marginBottom: 16,
				flexWrap: "wrap",
				gap: 8,
			}}>
				<div style={Object.assign({}, os(12, 400, GRAY))}>
					{models.length} {models.length === 1 ? "modelo guardado" : "modelos guardados"}
				</div>
				<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
					<button
						onClick={function () { setEditingId("new"); }}
						style={{
							padding: "6px 14px",
							background: BLUE,
							color: WHITE,
							border: "none",
							borderRadius: 7,
							fontFamily: "'Open Sans',sans-serif",
							fontSize: 12,
							fontWeight: 700,
							cursor: "pointer",
						}}
					>
						+ Nuevo modelo
					</button>
					<button
						onClick={handleExport}
						style={{ padding: "6px 14px", background: WHITE, color: GRAY, border: "1.5px solid " + BORD, borderRadius: 7, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
					>
						Exportar JSON
					</button>
					<label style={{ padding: "6px 14px", background: WHITE, color: GRAY, border: "1.5px solid " + BORD, borderRadius: 7, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
						Importar JSON
						<input type="file" accept=".json" onChange={handleImportFile} style={{ display: "none" }} />
					</label>
					<button
						onClick={function () { if (window.confirm("¿Restaurar modelos por defecto? Se perderán los cambios.")) resetToDefaults(); }}
						style={{ padding: "6px 14px", background: WHITE, color: GRAY, border: "1.5px solid " + BORD, borderRadius: 7, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
					>
						Restaurar defaults
					</button>
				</div>
			</div>

			{importError && (
				<div style={{ background: ERBG, border: "1px solid " + ER + "44", borderRadius: 8, padding: "8px 14px", marginBottom: 12 }}>
					<span style={os(11, 700, ER)}>{importError}</span>
				</div>
			)}
			{importSuccess && (
				<div style={{ background: "#d1fae5", border: "1px solid " + OK + "44", borderRadius: 8, padding: "8px 14px", marginBottom: 12 }}>
					<span style={os(11, 700, OK)}>Modelos importados correctamente.</span>
				</div>
			)}

			{/* Model list */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
				{models.map(function (model) {
					return (
						<ModelCard
							key={model.id}
							model={model}
							isSelected={selectedId === model.id}
							isEditing={editingId === model.id}
							onSelect={function () { onSelect(model.id); }}
							onEdit={function () { setEditingId(editingId === model.id ? null : model.id); }}
							onDuplicate={function () { duplicate(model.id); }}
							onDelete={function () { remove(model.id); if (selectedId === model.id) onSelect(null); }}
						/>
					);
				})}
			</div>

			{/* Full-width editor — rendered outside the grid */}
			{editingId === "new" && (
				<ModelEditor
					model={EMPTY_MODEL}
					isNew={true}
					onSave={handleSave}
					onCancel={function () { setEditingId(null); }}
					currency={currency}
					tc={tc}
				/>
			)}
			{editingId && editingId !== "new" && (function () {
				var m = models.find(function (x) { return x.id === editingId; });
				return m ? (
					<ModelEditor
						key={editingId}
						model={m}
						isNew={false}
						onSave={handleSave}
						onCancel={function () { setEditingId(null); }}
						currency={currency}
						tc={tc}
					/>
				) : null;
			})()}

			{models.length === 0 && (
				<div style={{
					textAlign: "center",
					padding: "40px 20px",
					background: BLUEL,
					borderRadius: 12,
					border: "1px dashed " + BORD,
				}}>
					<div style={os(13, 400, GRAY)}>No hay modelos guardados.</div>
					<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 4 })}>Creá uno nuevo o restaurá los defaults.</div>
				</div>
			)}
		</div>
	);
}
