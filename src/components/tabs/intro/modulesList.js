// Orden y metadatos de los módulos de la Introducción.
import { ModPlataforma, ModCanales, ModPrecio, ModCotizar, ModCondiciones, ModSeguimiento } from "./Modules";

export const MODULES = [
	{ id: "plataforma", title: "La plataforma", sub: "Qué hace y cómo se navega", minutes: 2, Comp: ModPlataforma },
	{ id: "canales", title: "Los cuatro canales", sub: "Cuál corresponde a cada cliente", minutes: 2, Comp: ModCanales },
	{ id: "precio", title: "Cómo se arma un precio", sub: "Segmentos, niveles y simuladores", minutes: 4, Comp: ModPrecio },
	{ id: "cotizar", title: "Cotizar paso a paso", sub: "El recorrido y casos prácticos", minutes: 4, Comp: ModCotizar },
	{ id: "condiciones", title: "Condiciones y descuentos", sub: "Formas de liquidación y palancas", minutes: 3, Comp: ModCondiciones },
	{ id: "seguimiento", title: "Seguimiento y ajustes", sub: "Lo que pasa después del PDF", minutes: 2, Comp: ModSeguimiento },
];
