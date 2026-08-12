import { useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { BLUE, GRAY, os } from "@/theme/tokens";

// Pantalla de acceso. Firma con la misma marca que la sidebar y el PDF ("FID by
// Lakaut") para que el login se lea como parte de la app y no como un formulario
// genérico pegado adelante.
export function Login() {
	const { signIn } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	async function handleSubmit(e) {
		e.preventDefault();
		setError("");
		setBusy(true);
		const err = await signIn(email.trim(), password);
		setBusy(false);
		if (err) {
			// Supabase devuelve "Invalid login credentials" para email o password
			// incorrectos; lo traducimos para no filtrar cuál de los dos falló.
			setError("Email o contraseña incorrectos.");
		}
		// Si sale bien, onAuthStateChange actualiza la sesión y el gate desmonta esto.
	}

	return (
		<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--muted)", padding: 24 }}>
			<div className="glass" style={{ width: "100%", maxWidth: 380, borderRadius: 16, border: "1px solid var(--glass-border)", padding: "32px 28px", boxShadow: "0 12px 40px rgba(30,32,48,0.10)" }}>
				{/* Brand header */}
				<div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 3 }}>
					<span className="font-display" style={{ fontSize: 26, color: BLUE, lineHeight: 1 }}>FID</span>
					<span style={Object.assign({}, os(12, 600, GRAY), { lineHeight: 1 })}>by Lakaut</span>
				</div>
				<div style={Object.assign({}, os(11, 400, GRAY), { letterSpacing: "0.3px", marginBottom: 26 })}>Cotizador comercial</div>

				<form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<Label htmlFor="login-email">Email</Label>
						<Input
							id="login-email"
							type="email"
							autoComplete="username"
							autoFocus
							value={email}
							onChange={function (e) { setEmail(e.target.value); }}
							placeholder="tu@lakaut.com.ar"
							required
						/>
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<Label htmlFor="login-password">Contraseña</Label>
						<Input
							id="login-password"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={function (e) { setPassword(e.target.value); }}
							required
						/>
					</div>

					{error && (
						<div role="alert" style={Object.assign({}, os(12, 400, "var(--destructive)"), { color: "var(--destructive)" })}>
							{error}
						</div>
					)}

					<Button type="submit" disabled={busy} className="w-full">
						{busy
							? <><Loader2 className="animate-spin" size={16} /> Ingresando…</>
							: <><LogIn size={16} /> Ingresar</>}
					</Button>
				</form>
			</div>
		</div>
	);
}
