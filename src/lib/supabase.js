import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);

export async function loadConfig(key) {
	const { data, error } = await supabase
		.from("app_config")
		.select("value")
		.eq("key", key)
		.single();
	if (error || !data) return null;
	return data.value;
}

export async function saveConfig(key, value) {
	const { error } = await supabase
		.from("app_config")
		.upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
	if (error) console.error("Supabase saveConfig error:", error);
}

export function subscribeConfig(key, callback) {
	const channel = supabase
		.channel("config:" + key)
		.on(
			"postgres_changes",
			{ event: "UPDATE", schema: "public", table: "app_config", filter: "key=eq." + key },
			function (payload) { callback(payload.new.value); }
		)
		.subscribe();
	return function () { supabase.removeChannel(channel); };
}
