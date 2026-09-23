import { useState } from "react";
import { CHART_COLORS } from "../../theme/tokens";
import { cn } from "@/lib/utils";
import { useModels } from "../../context/ModelsContext";
import { NumInput } from "../ui/NumInput";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toaster";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/ConfirmDialog";

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

// Swatches de color de los modelos: la paleta de gráficos compartida.
const PRESET_COLORS = CHART_COLORS;

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
		<label className="mb-2 flex items-center gap-2.5">
			<span className="w-[130px] shrink-0 text-xs text-muted-foreground">{label}</span>
			<span className="flex-1">{children}</span>
		</label>
	);
}

function TextInput({ value, onChange, placeholder }) {
	return (
		<input
			type="text"
			value={value}
			placeholder={placeholder || ""}
			onChange={function (e) { onChange(e.target.value); }}
			className="box-border w-full rounded-md border-[1.5px] border-input bg-card px-2 py-1 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
	// On reopen: restore from model.priceARS if available (preserves exact ARS value entered).
	const [priceTruth, setPriceTruth] = useState(function () {
		if (isARS && model.priceARS != null) return { value: model.priceARS, currency: "ARS" };
		return { value: model.priceUSD || 0, currency: "USD" };
	});
	const [firmaExtraTruth, setFirmaExtraTruth] = useState(function () {
		if (isARS && model.firmaExtraARS != null) return { value: model.firmaExtraARS, currency: "ARS" };
		return { value: model.extraFirmaPrice || 0, currency: "USD" };
	});

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

	// 4-decimal precision avoids ARS→USD→ARS rounding loss (e.g. 50001/1500 = 33.3340, not 33.33)
	function toUSD4(arsVal) { return tc > 0 ? Math.round(arsVal / tc * 10000) / 10000 : 0; }

	const derivedPriceUSD = priceTruth.currency === "USD" ? (priceTruth.value || 0) : toUSD4(priceTruth.value || 0);
	const derivedFirmaExtraUSD = firmaExtraTruth.currency === "USD" ? (firmaExtraTruth.value || 0) : toUSD4(firmaExtraTruth.value || 0);
	const derivedPriceARS = priceTruth.currency === "ARS" ? priceTruth.value : Math.round((priceTruth.value || 0) * tc);
	const derivedFirmaExtraARS = firmaExtraTruth.currency === "ARS" ? firmaExtraTruth.value : Math.round((firmaExtraTruth.value || 0) * tc);

	// Hint shown below the field (the other currency)
	const precioHintARS = derivedPriceARS;
	const precioHintUSD = priceTruth.currency === "USD" ? (priceTruth.value || 0) : (tc > 0 ? (priceTruth.value || 0) / tc : 0);

	// isDirty: compare ARS when truth is ARS (more stable than USD floating point)
	const priceChanged = priceTruth.currency === "ARS"
		? derivedPriceARS !== (model.priceARS ?? Math.round((model.priceUSD || 0) * tc))
		: Math.abs(derivedPriceUSD - (model.priceUSD || 0)) > 0.00001;
	const firmaExtraChanged = firmaExtraTruth.currency === "ARS"
		? derivedFirmaExtraARS !== (model.firmaExtraARS ?? Math.round((model.extraFirmaPrice || 0) * tc))
		: Math.abs(derivedFirmaExtraUSD - (model.extraFirmaPrice || 0)) > 0.00001;

	const isDirty = JSON.stringify(draft) !== JSON.stringify(model) || priceChanged || firmaExtraChanged;

	const SectionTitle = function ({ text }) {
		return (
			<h3 className="mb-2.5 border-b border-border pb-1.5 text-xs font-bold tracking-[0.5px] text-muted-foreground uppercase">
				{text}
			</h3>
		);
	};

	return (
		<div className="mt-4 overflow-hidden rounded-xl border-2 border-primary/35 bg-card">
			{/* Editor header */}
			<div className="flex items-center justify-between bg-primary px-5 py-3">
				<div className="text-sm font-bold text-primary-foreground">
					{isNew ? "Nuevo modelo" : "Editando: " + model.label}
				</div>
				<div
					className="size-3.5 rounded-full border-2 border-white/50"
					style={{ background: draft.color }}
					aria-hidden="true"
				/>
			</div>

			<div className="p-5">
				{/* 2-column grid for sections */}
				<div className="grid gap-x-8 md:grid-cols-2">

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
							<div className="flex gap-1.5">
								{SEGMENT_OPTIONS.map(function (s) {
									return (
										<button
											key={s.k}
											onClick={function () { upd("segment", s.k); }}
											type="button"
											aria-pressed={draft.segment === s.k}
											className={cn(
												"cursor-pointer rounded-md border-[1.5px] px-3 py-1 text-xs font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
												draft.segment === s.k
													? "border-primary bg-primary text-primary-foreground"
													: "border-input bg-card text-muted-foreground"
											)}
										>
											{s.label}
										</button>
									);
								})}
							</div>
						</FieldRow>
						<FieldRow label="Color">
							<div className="flex flex-wrap gap-1.5">
								{PRESET_COLORS.map(function (c) {
									return (
										<button
											key={c}
											onClick={function () { upd("color", c); }}
											type="button"
											aria-label={"Color " + c}
											aria-pressed={draft.color === c}
											className={cn(
												"size-6 cursor-pointer rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50",
												draft.color === c ? "border-[3px] border-foreground" : "border-2 border-transparent"
											)}
											style={{ background: c }}
										/>
									);
								})}
							</div>
						</FieldRow>

						<div className="mt-5">
							<SectionTitle text="Display" />
						</div>
						<FieldRow label="Nota de precio">
							<TextInput value={draft.priceNote} onChange={function (v) { upd("priceNote", v); }} />
						</FieldRow>
						<FieldRow label="CTA button">
							<TextInput value={draft.cta} onChange={function (v) { upd("cta", v); }} />
						</FieldRow>
						<FieldRow label="Recomendado">
							<label className="flex cursor-pointer items-center gap-1.5">
								<input type="checkbox" checked={draft.recommended} onChange={function (e) { upd("recommended", e.target.checked); }} />
								<span className="text-xs text-muted-foreground">Mostrar badge "Recomendado"</span>
							</label>
						</FieldRow>
						<FieldRow label="Activo">
							<label className="flex cursor-pointer items-center gap-1.5">
								<input type="checkbox" checked={draft.activo !== false} onChange={function (e) { upd("activo", e.target.checked); }} />
								<span className="text-xs text-muted-foreground">Visible en cotizadora y Canal Web</span>
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
								className="w-full cursor-pointer rounded-md border-[1.5px] border-input bg-card px-2 py-1 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
							>
								{ARCH_OPTIONS.map(function (a) {
									return <option key={a.k} value={a.k}>{a.label}</option>;
								})}
							</select>
						</FieldRow>
						<FieldRow label={"Precio s/IVA (" + (isARS ? "ARS" : "USD") + ")"}>
							<div className="flex flex-col gap-1">
								<NumInput value={precioDisplay} onChange={updPrecio} prefix={isARS ? "$" : "USD"} />
								<span className="text-xs text-muted-foreground">
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

						<div className="mt-5">
							<SectionTitle text="Contenido del pack" />
						</div>
						<FieldRow label="Certificados">
							<NumInput value={draft.certs} onChange={function (v) { upd("certs", v); }} suffix="cert" />
						</FieldRow>
						<FieldRow label="Firmas incluidas">
							<div className="flex items-center gap-2">
								<div className="flex-1">
									<NumInput
										value={draft.firmas}
										onChange={function (v) { upd("firmas", v); upd("ilimitadas", false); }}
										suffix="firmas"
									/>
								</div>
								<label className="flex shrink-0 cursor-pointer items-center gap-1.5">
									<input
										type="checkbox"
										checked={draft.ilimitadas}
										onChange={function (e) { upd("ilimitadas", e.target.checked); }}
									/>
									<span className="text-xs text-muted-foreground">Ilimitadas</span>
								</label>
							</div>
						</FieldRow>
						<FieldRow label="Admins">
							<NumInput value={draft.admins || 0} onChange={function (v) { upd("admins", v || null); }} suffix="admin" />
						</FieldRow>
						<FieldRow label={"Firma adicional (" + (isARS ? "ARS" : "USD") + ")"}>
							<div className="flex flex-col gap-1">
								<NumInput value={firmaExtraDisplay} onChange={updFirmaExtra} prefix={isARS ? "$" : "USD"} suffix="/ firma" />
								{firmaExtraDisplay > 0 && (
									<span className="text-xs text-muted-foreground">
										{isARS
											? ("≈ USD " + (draft.extraFirmaPrice || 0).toFixed(2))
											: ("≈ $ " + (draft.firmaExtraARS || Math.round((draft.extraFirmaPrice || 0) * tc)).toLocaleString("es-AR") + " ARS")
										}
									</span>
								)}
							</div>
						</FieldRow>

					</div>
				</div>

				{/* Actions */}
				<div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
					<button
						onClick={onCancel}
						type="button"
						className="cursor-pointer rounded-md border-[1.5px] border-input bg-card px-5 py-2 text-xs font-bold text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
					>
						Cancelar
					</button>
					<button
						onClick={function () { onSave(Object.assign({}, draft, { priceUSD: derivedPriceUSD, priceARS: derivedPriceARS, priceDefinedIn: priceTruth.currency, extraFirmaPrice: derivedFirmaExtraUSD, firmaExtraARS: derivedFirmaExtraARS })); }}
						disabled={!isDirty && !isNew}
						type="button"
						className={cn(
							"rounded-md border-none px-5 py-2 text-xs font-bold text-white outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
							isDirty || isNew ? "cursor-pointer bg-primary" : "cursor-default bg-input"
						)}
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
			className={cn("overflow-hidden rounded-xl border-2 bg-card", isEditing && "ring-[3px] ring-primary/15")}
			style={{ borderColor: isEditing ? "var(--primary)" : isSelected ? model.color : "var(--border)" }}
		>
			{/* Header */}
			<button
				type="button"
				onClick={onSelect}
				aria-pressed={isSelected}
				className="flex w-full cursor-pointer items-center gap-3 border-none px-3.5 py-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
				style={{ background: isSelected ? model.color + "0d" : "var(--card)" }}
			>
				<span className="size-2.5 shrink-0 rounded-full" style={{ background: model.color }} aria-hidden="true" />
				<span className="min-w-0 flex-1">
					<span className="block text-sm font-bold text-foreground">{model.label}</span>
					<span className="mt-px block text-xs text-muted-foreground">
						{model.segment === "persona" ? "Persona" : "Empresa"} · {model.arch} · USD {model.priceUSD}
					</span>
				</span>
				<span className="flex shrink-0 gap-1">
					<span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground tabular-nums">
						{model.ilimitadas ? "∞ firmas" : (model.firmas || 0).toLocaleString("es-AR") + " firmas"}
					</span>
					<span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground tabular-nums">
						{model.certs} cert · {model.vigencia}m
					</span>
				</span>
			</button>

			{/* Actions */}
			<div className="flex border-t border-border bg-muted/40">
				{[
					{ label: "Editar", action: onEdit },
					{ label: "Duplicar", action: onDuplicate },
				].map(function (btn) {
					return (
						<button
							key={btn.label}
							onClick={btn.action}
							type="button"
							className="flex-1 cursor-pointer border-none border-r border-border bg-transparent py-1.5 text-xs font-bold text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							{btn.label}
						</button>
					);
				})}
				{confirmDelete ? (
					<>
						<button
							onClick={function () { setConfirmDelete(false); }}
							type="button"
							className="flex-1 cursor-pointer border-none bg-transparent py-1.5 text-xs font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 border-r border-border text-muted-foreground"
						>
							Cancelar
						</button>
						<button
							onClick={onDelete}
							type="button"
							className="flex-1 cursor-pointer border-none bg-transparent py-1.5 text-xs font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 bg-[#fee2e2] text-destructive"
						>
							¿Confirmar?
						</button>
					</>
				) : (
					<button
						onClick={function () { setConfirmDelete(true); }}
						type="button"
						className="flex-1 cursor-pointer border-none bg-transparent py-1.5 text-xs font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 text-destructive"
					>
						Eliminar
					</button>
				)}
			</div>
		</div>
	);
}

export function TabGuardados({ selectedId, onSelect, currency, tc }) {
	const confirm = useConfirm();
	const { models, upsert, remove, duplicate, resetToDefaults } = useModels();
	const [editingId, setEditingId] = useState(null); // null | "new" | model.id
	const { toast } = useToast();

	function showToast(msg) {
		toast({ variant: "success", title: msg, duration: 3000 });
	}

	function handleSave(draft) {
		const model = editingId === "new"
			? Object.assign({}, draft, { id: "model_" + Date.now() })
			: draft;
		upsert(model);
		setEditingId(null);
		if (editingId === "new") {
			onSelect(model.id);
			showToast("Modelo \"" + model.label + "\" creado");
		} else {
			showToast("Cambios guardados en \"" + model.label + "\"");
		}
	}

	return (
		<div className="space-y-5">
			<PageHeader
				title="Modelos y packs"
				description={models.length + " " + (models.length === 1 ? "modelo guardado" : "modelos guardados") + ". Definen los packs que se cotizan en todos los canales."}
				actions={
					<>
						<Button size="sm" onClick={function () { setEditingId("new"); }}>+ Nuevo modelo</Button>
						<Button size="sm" variant="outline" onClick={async function () {
							const ok = await confirm({
								title: "¿Restaurar los modelos por defecto?",
								description: "Se pierden todos los modelos que hayas creado o editado.",
								confirmLabel: "Restaurar",
							});
							if (ok) resetToDefaults();
						}}>Restaurar defaults</Button>
					</>
				}
			/>

			{/* Model list */}
			<div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))]">
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
				<div className="rounded-xl border border-dashed border-border bg-secondary px-5 py-10 text-center">
					<div className="text-sm text-muted-foreground">No hay modelos guardados.</div>
					<div className="mt-1 text-xs text-muted-foreground">Creá uno nuevo o restaurá los defaults.</div>
				</div>
			)}
		</div>
	);
}
