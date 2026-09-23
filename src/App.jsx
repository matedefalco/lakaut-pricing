import { Loader2 } from "lucide-react";
import LakautCalc from "./LakautCalc";
import { AuthProvider, useAuth } from "./lib/useAuth";
import { Login } from "./components/Login";

// Gate de autenticación: sin sesión, solo se ve el login. La cotizadora ni se
// monta (no dispara consultas a Supabase, que además RLS rechazaría sin token).
function Gate() {
	const { session, loading } = useAuth();

	if (loading) {
		return (
			<div className="flex min-h-svh items-center justify-center bg-muted">
				<Loader2 className="animate-spin text-primary" size={28} />
			</div>
		);
	}

	if (!session) return <Login />;
	return <LakautCalc />;
}

export default function App() {
	return (
		<AuthProvider>
			<Gate />
		</AuthProvider>
	);
}
