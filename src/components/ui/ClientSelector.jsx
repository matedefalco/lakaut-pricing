import { useState, useRef, useEffect } from "react";
import { UserPlus, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const CHANNEL_LABEL = { web: "Web", distribuidores: "Distribuidores", b2b2c: "B2B2C" };

export function ClientSelector({ channel, clients, onCreate, value, onChange }) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const ref = useRef(null);

	// Close on outside click
	useEffect(function () {
		function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
		document.addEventListener("mousedown", handler);
		return function () { document.removeEventListener("mousedown", handler); };
	}, []);

	const filtered = clients
		.filter(function (c) { return !query || c.name.toLowerCase().includes(query.toLowerCase()); });

	function select(client) {
		onChange(client);
		setOpen(false);
		setQuery("");
		setCreating(false);
	}

	function clear(e) {
		e.stopPropagation();
		onChange(null);
		setQuery("");
	}

	async function handleCreate() {
		if (!newName.trim()) return;
		const client = await onCreate(newName.trim(), channel);
		if (client) { select(client); setNewName(""); }
	}

	return (
		<div ref={ref} className="relative">
			<div
				className="flex items-center gap-2 border border-border rounded-md px-3 py-2 bg-background cursor-pointer hover:border-primary/60 transition-colors min-h-[38px]"
				onClick={function () { setOpen(!open); }}
			>
				{value ? (
					<>
						<span className="flex-1 text-sm font-medium">{value.name}</span>
						<Badge variant="secondary" className="text-[10px] shrink-0">{CHANNEL_LABEL[value.channel] || value.channel}</Badge>
						<button onClick={clear} className="text-muted-foreground hover:text-foreground ml-1 shrink-0"><X className="size-3.5" /></button>
					</>
				) : (
					<>
						<span className="flex-1 text-sm text-muted-foreground">Buscar o crear cliente...</span>
						<ChevronDown className="size-4 text-muted-foreground shrink-0" />
					</>
				)}
			</div>

			{open && (
				<div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-md overflow-hidden">
					<div className="p-2 border-b border-border">
						<Input
							autoFocus
							placeholder="Buscar cliente..."
							value={query}
							onChange={function (e) { setQuery(e.target.value); setCreating(false); }}
							className="h-8 text-sm"
						/>
					</div>

					<div className="max-h-52 overflow-y-auto">
						{filtered.length > 0 && filtered.map(function (c) {
							return (
								<button
									key={c.id}
									onClick={function () { select(c); }}
									className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
								>
									<span className={value?.id === c.id ? "font-semibold" : ""}>{c.name}</span>
									{c.channel === "distribuidores" && c.certs_activos > 0 && (
										<span className="text-xs text-muted-foreground">{c.certs_activos.toLocaleString("es-AR")} certs</span>
									)}
								</button>
							);
						})}

						{filtered.length === 0 && !creating && (
							<p className="text-xs text-muted-foreground px-3 py-2">Sin resultados para "{query}"</p>
						)}

						{/* Crear nuevo */}
						{!creating ? (
							<button
								onClick={function () { setCreating(true); setNewName(query); }}
								className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent border-t border-border"
							>
								<UserPlus className="size-3.5" />
								{query ? `Crear "${query}"` : "Nuevo cliente"}
							</button>
						) : (
							<div className="p-2 border-t border-border flex gap-2">
								<Input
									autoFocus
									placeholder="Nombre del cliente"
									value={newName}
									onChange={function (e) { setNewName(e.target.value); }}
									onKeyDown={function (e) { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
									className="h-8 text-sm flex-1"
								/>
								<button
									onClick={handleCreate}
									disabled={!newName.trim()}
									className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-md disabled:opacity-50"
								>
									Crear
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
