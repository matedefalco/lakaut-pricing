import { useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";

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
		<div className="flex min-h-svh items-center justify-center bg-muted p-6">
			<div className="glass shadow-float w-full max-w-[380px] rounded-2xl border border-[var(--glass-border)] px-7 py-8">
				{/* Brand header */}
				<div className="mb-1 flex items-baseline gap-1.5">
					<span className="font-display text-xl leading-none text-primary">FID</span>
					<span className="text-sm leading-none font-semibold text-muted-foreground">by Lakaut</span>
				</div>
				<div className="mb-6 text-xs tracking-[0.3px] text-muted-foreground">Cotizador comercial</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
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
					<div className="flex flex-col gap-1.5">
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
						<div role="alert" className="text-sm text-destructive">
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
