import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ─── Autenticación · sesión global ────────────────────────────────────────────
// Envuelve la app: mientras no haya sesión de Supabase Auth, se muestra el login
// y no se monta la cotizadora. Los usuarios se dan de alta a mano en el Dashboard
// (Authentication → Users), no hay registro público. El token de sesión lo maneja
// el SDK solo y viaja en cada request, así RLS (policies `to authenticated`) deja
// pasar las consultas. Ver la nota de RLS en supabase.js / migraciones.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [session, setSession] = useState(null);
	// `loading` cubre el arranque: getSession es async y sin esto se vería un
	// parpadeo del login antes de saber si ya había sesión guardada.
	const [loading, setLoading] = useState(true);

	useEffect(function () {
		supabase.auth.getSession().then(function (res) {
			setSession(res.data.session);
			setLoading(false);
		});
		// Reacciona a login, logout y refresh de token en cualquier pestaña.
		const { data } = supabase.auth.onAuthStateChange(function (_event, s) {
			setSession(s);
		});
		return function () { data.subscription.unsubscribe(); };
	}, []);

	const signIn = useCallback(async function (email, password) {
		const { error } = await supabase.auth.signInWithPassword({ email: email, password: password });
		return error;
	}, []);

	const signOut = useCallback(async function () {
		await supabase.auth.signOut();
	}, []);

	const value = { session: session, loading: loading, signIn: signIn, signOut: signOut };
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
	return ctx;
}
