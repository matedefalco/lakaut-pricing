// ─── Modelo de canales Lakaut ─────────────────────────────────────────────────
// Fuente de verdad del modelo comercial multicanal (Borrador v5).
// 3 canales: Web (directo), Distribuidores (descuento sobre lista), B2B2C (IDC).
//
// Convención de moneda:
//   · Canal Web → precios en ARS (source of truth). El USD se deriva con el TC.
//   · Distribuidores → descuento % sobre la lista web (mismo ARS).
//   · B2B2C → precios y costos en USD (unidad IDC).
//
// Todo lo de este archivo son DEFAULTS: la config viva se edita en
// Config → Precios por canal y se persiste en app_config (ver ChannelConfigContext).

// ── Canal A · Web Lakaut ──────────────────────────────────────────────────────
// Precios de lista en ARS. firmaExtraARS = precio por firma adicional.
// certs = cantidad de firmantes (certificados) incluidos.
export const WEB_PRODUCTS = [
	{
		id: "smart",
		label: "Smart",
		segment: "persona",
		precioARS: 61700,
		certs: 1,
		firmas: 20,
		ilimitadas: false,
		firmaExtraARS: 3085,
		selloCompetencia: false,
		desc: "Personas que firman contratos o trámites de manera ocasional",
	},
	{
		id: "profesional",
		label: "Profesional",
		segment: "persona",
		precioARS: 250000,
		certs: 3,
		firmas: 100,
		ilimitadas: false,
		firmaExtraARS: 2500,
		selloCompetencia: false,
		desc: "Profesionales que firman documentos con frecuencia",
	},
	{
		id: "profesional_plus",
		label: "Profesional Plus",
		segment: "persona",
		precioARS: 363000,
		certs: 3,
		firmas: null,
		ilimitadas: true,
		firmaExtraARS: null, // firmas ilimitadas; usa sello de competencia
		selloCompetencia: true,
		desc: "Profesionales con alto volumen y necesidad de sello de competencia",
	},
	{
		id: "pyme",
		label: "PyME",
		segment: "empresa",
		precioARS: 180000,
		certs: 5,
		firmas: 100,
		ilimitadas: false,
		firmaExtraARS: 1800,
		selloCompetencia: false,
		desc: "Empresas que comienzan a digitalizar sus procesos de firma",
	},
	{
		id: "empresa",
		label: "Empresa",
		segment: "empresa",
		precioARS: 540000,
		certs: 10,
		firmas: 3000,
		ilimitadas: false,
		firmaExtraARS: 1800,
		selloCompetencia: false,
		desc: "Organizaciones con mayor volumen y múltiples áreas firmantes",
	},
	{
		id: "enterprise",
		label: "Enterprise",
		segment: "empresa",
		precioARS: null, // a consultar
		certs: null,
		firmas: null,
		ilimitadas: true,
		firmaExtraARS: null,
		selloCompetencia: true,
		desc: "Grandes organizaciones con bases de clientes masivas (a medida)",
	},
];

// ── Firma adicional del canal Web · escala por volumen ────────────────────────
// Precio por firma adicional del sitio ("Agregá más firmas a tu cuenta", pago
// único): a mayor cantidad, menor el precio por unidad. Reemplaza el precio plano
// por plan que traían los modelos. Es la MISMA escala para todos los planes y está
// en ARS (moneda del catálogo); el cotizador la convierte a USD con el TC porque el
// resto del cálculo del canal es USD-native. El precio de un tramo aplica desde su
// umbral de firmas hacia arriba; por debajo del primer tramo se usa el primero.
// Distribuidores-packs descuenta sobre esta lista, así que hereda la escala.
export const WEB_FIRMA_EXTRA_TIERS = [
	{ firmas: 10, precioARS: 1493 },
	{ firmas: 20, precioARS: 1344 },
	{ firmas: 50, precioARS: 1195 },
	{ firmas: 100, precioARS: 1045 },
];

// ── Canal B · Distribuidores e Integradores ────────────────────────────────────
// Descuento sobre la lista web. El nivel es el MAYOR que resulte entre dos
// variables DECLARADAS del socio, no del volumen de la cotización en curso:
//   · certsActivos      → certificados activos que Lakaut le administra hoy.
//   · compromisoAnualUSD → facturación anual que el socio se compromete a generar.
// Es lo que permite que un integrador con 200 certificados (Bronce) que compromete
// USD 40.000 al año entre directamente como Plata. El nivel queda sujeto al
// cumplimiento efectivo del compromiso (cláusula en la propuesta).
export const DISTRIBUTOR_TIERS = [
	{ id: "azul", label: "Azul", certsMin: 0, certsMax: 100, descuento: 0.10, compromisoMin: 0, compromisoMax: 10000 },
	{ id: "bronce", label: "Bronce", certsMin: 101, certsMax: 500, descuento: 0.15, compromisoMin: 10001, compromisoMax: 25000 },
	{ id: "plata", label: "Plata", certsMin: 501, certsMax: 2500, descuento: 0.25, compromisoMin: 25001, compromisoMax: 50000 },
	{ id: "oro", label: "Oro", certsMin: 2501, certsMax: 10000, descuento: 0.40, compromisoMin: 50001, compromisoMax: 250000 },
	{ id: "platinum", label: "Platinum", certsMin: 10001, certsMax: null, descuento: 0.50, compromisoMin: 250001, compromisoMax: null },
];

// ── Canal C · IDC ───────────────────────────────────────────────────────────────
// La unidad de venta es la IDC (Identidad Digital Certificada), no el certificado
// suelto: un bundle que integra la validación biométrica, la emisión del
// certificado, su custodia, la firma inicial que requiere la institución y las
// firmas de activación destinadas a que el usuario descubra la herramienta. Las
// firmas que superen ese cupo se venden por unidad.
//
// El segmento sale del VOLUMEN DE IDC MENSUALES, con los umbrales del Borrador v5.
// A diferencia del canal de distribuidores, acá el segmento no da un descuento
// sobre una lista: cada segmento tiene su propio precio por IDC. Es una escala de
// precios, no de descuentos, y por eso el precio es un dato del segmento y no una
// fórmula.
//
// El umbral inferior del primer segmento es 0 y no 1.000: un volumen menor cotiza
// como Start Up en lugar de quedar sin precio.
//   - idcMin/idcMax: rango de IDC mensuales; null = sin tope.
//   - precioIDC: precio unitario de la IDC en USD.
//   - firmasIncluidas: cupo de firmas que entran en cada IDC sin cargo extra.
//   - precioFirmaExtra: precio unitario de cada firma por encima del cupo.
//
// ── Por qué estos precios y no los del documento ──
// La tabla del Borrador v5 (0,65 a 0,45) no cierra contra el costo real del bundle:
// su columna "MARGEN" está calculada contra el costo del certificado SOLO
// (USD 0,3741), pero su propia definición de IDC incluye firmas. Con los costos
// cargados en la app (cert 0,3750 + firma 0,1334) una IDC con 3 firmas cuesta
// USD 0,7752, y a 0,45 se estaría vendiendo por debajo del costo.
//
// La escala se reconstruyó (jul 2026) fijando el precio MÁS BAJO en el mínimo
// viable (1,20x el costo = USD 0,9303) y subiendo el resto en la misma proporción
// que el documento (Plataforma paga 69% de Start Up, igual que 0,45 vs 0,65). El
// resultado reproduce casi exacto la columna MARGEN del doc leída como markup:
// 1,73x / 1,60x / 1,47x / 1,33x / 1,20x, contra el 74/60/47/34/20% que ahí figura.
export const B2B2C_SEGMENTS = [
	{ id: "startup", label: "Start Up", idcMin: 0, idcMax: 10000, precioIDC: 1.3438, firmasIncluidas: 3, precioFirmaExtra: 0.50 },
	{ id: "growth", label: "Growth", idcMin: 10001, idcMax: 50000, precioIDC: 1.2404, firmasIncluidas: 3, precioFirmaExtra: 0.50 },
	{ id: "pyme", label: "PyME", idcMin: 50001, idcMax: 200000, precioIDC: 1.1370, firmasIncluidas: 3, precioFirmaExtra: 0.50 },
	{ id: "empresa", label: "Empresa", idcMin: 200001, idcMax: 600000, precioIDC: 1.0337, firmasIncluidas: 3, precioFirmaExtra: 0.50 },
	{ id: "plataforma", label: "Plataforma", idcMin: 600001, idcMax: null, precioIDC: 0.9303, firmasIncluidas: 3, precioFirmaExtra: 0.50 },
];

// Cupo de firmas por IDC: la firma inicial que requiere la institución más las de
// activación. Es el default de los segmentos nuevos.
export const B2B2C_FIRMAS_INCLUIDAS = 3;

// Guardarraíl de rentabilidad, expresado como MARKUP sobre el costo variable
// (precio ÷ costo), que es la métrica de la columna "MARGEN" del Borrador v5. Se
// evalúa sobre el total MEZCLADO (IDC + firmas extra), así una IDC con precio
// agresivo no dispara la alarma cuando las firmas compensan. Bajo el mínimo no se
// puede guardar ni exportar. La pantalla de Config muestra el precio mínimo viable
// de cada segmento contra el costo de su bundle.
export const B2B2C_MARKUP_MIN = 1.20;

// ── Canal D · Volumen ───────────────────────────────────────────────────────────
// Certificados y firmas como items independientes: se cargan las cantidades a mano
// y cada elemento tiene su precio, sin bundle ni cupo de firmas incluidas. Es el
// canal para cotizar volumen puro, donde el cliente sabe exactamente cuántos
// certificados y cuántas firmas necesita y quiere ver el ingreso y el costo de cada
// uno por separado.
//
// A diferencia de IDC, acá el segmento SÍ es una escala de descuentos: hay un precio
// de lista para el certificado y otro para la firma, y el segmento aplica el mismo
// porcentaje sobre ambos.
export const VOLUMEN_BASE = { cert: 0.65, firma: 0.50 };

// La métrica que asigna el segmento es el COMPROMISO del contrato en USD, medido a
// precio de lista: certificados × base.cert + firmas × base.firma, por los meses de
// vinculación. Al ser un único número en dólares es conmutativo: pocos certificados
// con muchas firmas y muchos certificados con pocas firmas caen en el mismo segmento
// si representan el mismo negocio. Usar siempre el precio BASE (nunca el ya
// descontado) es lo que rompe la circularidad precio↔segmento.
export const VOLUMEN_SEGMENTS = [
	{ id: "startup", label: "Start Up", compromisoMin: 0, compromisoMax: 25000, descuento: 0 },
	{ id: "growth", label: "Growth", compromisoMin: 25001, compromisoMax: 125000, descuento: 0.10 },
	{ id: "pyme", label: "PyME", compromisoMin: 125001, compromisoMax: 500000, descuento: 0.20 },
	{ id: "empresa", label: "Empresa", compromisoMin: 500001, compromisoMax: 1500000, descuento: 0.30 },
	{ id: "plataforma", label: "Plataforma", compromisoMin: 1500001, compromisoMax: null, descuento: 0.40 },
];

// ── Canal E · Distribuidores e Integradores (modalidad Volumen) ───────────────
// Réplica del canal Volumen (certificados y firmas sueltos, con el mismo precio
// base VOLUMEN_BASE y el mismo cálculo por elemento) pero con los NIVELES
// característicos del canal de distribuidores (Azul→Platinum) como segmento.
//
// El nivel lo asigna el VOLUMEN REAL DE FIRMAS de la cotización en curso (firmas por
// certificado + firmas sueltas), no una variable declarada aparte: la comercialización
// es a escala, así que el beneficio se otorga por el volumen que efectivamente se pone
// sobre la mesa. Los rangos van en cantidad de firmas. El compromiso anual en USD ya no
// se ingresa a mano ni asigna el nivel: se deriva de la cotización (volumen × precio
// cotizado × 12) y viaja a la propuesta como el compromiso declarado del socio.
//
// A diferencia de DISTRIBUTOR_TIERS (descuento 10%–50% sobre la LISTA WEB, que tiene
// margen amplio), acá el descuento se aplica sobre la base por unidad (cert 0,65 /
// firma 0,50), que está cerca del costo. Por eso la escala es más conservadora: un
// 50% dejaría el certificado (costo ≈ 0,375) por debajo del piso de rentabilidad.
// Los descuentos se toparon para que el certificado no baje del markup mínimo del
// canal por elemento (B2B2C_MARKUP_MIN = 1,20x → precio mínimo 0,45, ~31% de
// descuento máximo sobre 0,65). El guardarraíl del cotizador bloquea igual guardar y
// exportar si el markup mezclado no cierra, así que la escala es el techo prudente y
// el piso es duro. La escala prioriza el VOLUMEN por sobre la recurrencia: el abono
// mensual (ABONO_DESCUENTO_PCT) otorga un beneficio menor que el salto de nivel.
//   - firmasMin/firmasMax: rango de firmas de la cotización; null = sin tope.
//   - descuento: % sobre el precio base del certificado y de la firma por igual.
export const DISTRIBUIDOR_VOL_TIERS = [
	{ id: "azul", label: "Azul", firmasMin: 1, firmasMax: 1000, descuento: 0.03 },
	{ id: "bronce", label: "Bronce", firmasMin: 1001, firmasMax: 5000, descuento: 0.08 },
	{ id: "plata", label: "Plata", firmasMin: 5001, firmasMax: 10000, descuento: 0.15 },
	{ id: "oro", label: "Oro", firmasMin: 10001, firmasMax: 50000, descuento: 0.22 },
	{ id: "platinum", label: "Platinum", firmasMin: 50001, firmasMax: null, descuento: 0.30 },
];

// ── Escalonado de crecimiento · Volumen ──────────────────────────────────────
// Escala ESTÁNDAR de precios por volumen de firmas que se adjunta a las propuestas
// de Volumen: un escalonado fijo, el mismo para todas las cotizaciones, para tener
// referencia y ser justos entre clientes. Cada escalón es un umbral ABSOLUTO de
// firmas con su descuento sobre el precio base de la firma (VOLUMEN_BASE.firma), así
// el precio por firma de cada escalón es idéntico en toda propuesta.
//
// Es amplio a propósito (varios escalones cubriendo un espectro de volumen) para que
// cada cliente encuentre el tramo que se adecúa a su necesidad. Se configura una vez
// en Config → Precios por canal y, por defecto, va en toda propuesta de Volumen; el
// vendedor puede ajustarlo por propuesta puntual (queda marcado como personalizado).
export const VOLUMEN_PROYECCION = [
	{ firmas: 10000, descuento: 5 },
	{ firmas: 50000, descuento: 10 },
	{ firmas: 100000, descuento: 15 },
	{ firmas: 250000, descuento: 20 },
	{ firmas: 500000, descuento: 25 },
	{ firmas: 1000000, descuento: 30 },
];

// Fee de implementación (única vez). Default = punto medio del rango, editable.
// La integración es por SDK (no API). Los ids se conservan (standard/professional/
// enterprise) porque viajan en cotizaciones y configs guardadas; solo cambia el label.
export const B2B2C_API_TIERS = [
	{ id: "standard", label: "SDK Standard", feeMin: 1500, feeMax: 5000, feeDefault: 3250 },
	{ id: "professional", label: "SDK Professional", feeMin: 5000, feeMax: 25000, feeDefault: 15000 },
	{ id: "enterprise", label: "SDK Enterprise", feeMin: 25000, feeMax: 50000, feeDefault: 37500 },
];

// ── Palancas de descuento comercial ──────────────────────────────────────────
// Descuentos por condiciones favorables, aplicables en Volumen y Distribuidores.
// El volumen ya está en el precio (segmento/tabla o nivel); estas 3 palancas suman
// un % adicional (aditivo) sobre el subtotal de servicio, con un tope máximo.
// Cada palanca es una lista de opciones {id, label, discount} (discount en puntos %).
// Escala de referencia (Borrador v5): ajustar en Config → Precios por canal.
//   - timeToCash: cuánto tarda el cliente en pagarnos (más rápido → más descuento).
//   - duracion: duración de la vinculación / contrato (más largo → más descuento).
//   - velocidad: cuánto tarda en confirmar el acuerdo (más rápido → más descuento).
// `cap` = tope máximo de la SUMA de las 3 palancas (puntos %). El default de cada
// palanca es la opción con 0% (precio base; el vendedor sube desde ahí).
// Descuento del abono mensual (reposición de la bolsa de firmas). Valor por
// defecto en puntos %; se puede sobrescribir manualmente en cada cotización.
// Aplica a Volumen y Distribuidores. Se mantiene BAJO a propósito: el beneficio
// principal lo otorga el volumen (nivel/segmento), no el simple compromiso de un
// abono mensual, así que la recurrencia suma poco por encima del precio de volumen.
export const ABONO_DESCUENTO_PCT = 3;

// Cada opción es { id, value (número), discount (puntos %) }. El texto visible se
// deriva del número según la palanca (ver src/lib/commercialLevers.js): la opción
// de mayor valor se muestra como "N o más". time-to-cash con value 0 = "contado".
export const COMMERCIAL_LEVERS = {
	cap: 15,
	timeToCash: [
		{ id: "ttc0", value: 0, discount: 8 },
		{ id: "ttc30", value: 30, discount: 4 },
		{ id: "ttc60", value: 60, discount: 2 },
		{ id: "ttc90", value: 90, discount: 0 },
	],
	duracion: [
		{ id: "dur12", value: 12, discount: 0 },
		{ id: "dur24", value: 24, discount: 3 },
		{ id: "dur36", value: 36, discount: 6 },
		{ id: "dur48", value: 48, discount: 9 },
	],
	velocidad: [
		{ id: "vel15", value: 15, discount: 4 },
		{ id: "vel30", value: 30, discount: 2 },
		{ id: "vel60", value: 60, discount: 1 },
		{ id: "vel90", value: 90, discount: 0 },
	],
};

// ── Servicios premium / SLA ─────────────────────────────────────────────────────
// Precio mensual en USD. Standard incluido en todos los productos.
export const SLA_PLANS = [
	{ id: "standard", label: "Standard", precioMes: 0, sla: null, txMes: null, desc: "Horario comercial · mail y portal · respuesta hasta 8 h hábiles" },
	{ id: "professional", label: "Professional", precioMes: 1000, sla: 0.999, txMes: 1000, desc: "Atención extendida · prioridad media · respuesta hasta 4 h" },
	{ id: "enterprise", label: "Enterprise", precioMes: 3000, sla: 0.999, txMes: 10000, desc: "24x7 · ejecutivo técnico · respuesta <1 h en críticos" },
	{ id: "dedicated", label: "SLA Dedicado", precioMes: null, sla: 0.999, txMes: null, desc: "+10.000 tx/mes · personalizado" },
];
