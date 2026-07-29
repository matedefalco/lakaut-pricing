# Relevamiento · Emotional design

Fecha: 2026-07-29
Alcance: 12 pantallas, 45 componentes (`src/components/tabs` + `src/components/ui`), el chrome (`LakautCalc.jsx`), los tokens (`src/index.css`, `src/theme/tokens.js`) y el export a PDF (`src/utils/exportProposal.js`).

---

## Método

Tres niveles de Norman, aplicados a cada pantalla y a cada componente compartido:

→ **Visceral**: qué transmite en el primer segundo, antes de leer. Color, material, forma, densidad, tipografía.
→ **Conductual**: qué se siente al usarlo. Feedback, causa-efecto, recompensa, previsibilidad.
→ **Reflexivo**: qué historia cuenta y cómo hace ver al usuario. Marca, orgullo, sentido.

Cruce con la jerarquía de Walter (funcional → confiable → usable → placentera) para ubicar el escalón real.

---

## Diagnóstico en una línea

La app está sólida en los tres primeros escalones y nunca llega al cuarto. **La causa no es falta de diseño, es exceso de uniformidad**: un solo acento de color, un solo material y una sola forma para 45 componentes. Todo está bien resuelto y nada se destaca, así que el cerebro no encuentra dónde apoyarse.

Y hay un hallazgo que ordena todo el resto: **el PDF que ve el cliente tiene más personalidad que la app que usa el vendedor**. `exportProposal.js` ya tiene portada azul full-bleed, círculos decorativos, iconos SVG propios, pesos tipográficos hasta 800, cifras a 23pt y una sub-marca ("FID by Lakaut") que en la interfaz no existe. El lenguaje visual ya está escrito en el repo. Simplemente nunca volvió a la UI.

---

## Nivel 1 · Visceral

### 1.1 Monocromía de acento
`--primary: #3041d5` es el único acento del sistema y aparece en: nav activo, botón primario, badges de canal, número de paso del formulario, dots del ResultPanel, avatares de cliente, KPIs, pills de moneda, links, iconos de tooltip.

Cuando el mismo azul marca 9 cosas distintas, deja de marcar. La consecuencia es que **no hay jerarquía de importancia**: el badge "Packs" de una fila de tabla pesa visualmente lo mismo que el botón "Nueva cotización".

Los `--chart-2..5` (cyan, violeta, ámbar, verde) están declarados en `index.css:30-33` y casi no se usan fuera de los gráficos.

### 1.2 Un solo material para todo
`card.jsx:5` define la única superficie de la app: `bg-card` + `border-white/70` + `rounded-2xl` + `shadow-card`. Todo bloque de contenido es esa card. Inicio, cotizadoras, tablas, config, gráficos.

No hay jerarquía de superficie: nada se lee como "esto es el resultado" vs "esto es un dato de apoyo" vs "esto es referencia". El `Crystal Glass` documentado en `index.css:35-44` distingue chrome (vidrio) de contenido (sólido), pero dentro del contenido hay un solo nivel.

### 1.3 El gradiente existe y no se ve
`.app-bg` (`index.css:136-143`) tiene tres manchas radiales (azul, violeta, cyan) sobre base casi blanca. Las opacidades son 0.10 / 0.09 / 0.07: por debajo del umbral de percepción sobre un fondo `#f2f4fc`. **El único gesto expresivo del sistema está desperdiciado.** En pantalla se lee como gris plano.

### 1.4 Ninguna entidad del negocio tiene símbolo
14 de 45 archivos importan `lucide-react`, y siempre para acciones (`Trash2`, `Pencil`, `Check`, `ChevronDown`). Cero iconos para las entidades: canal, pack, certificado, firma, cliente, nivel, estado, moneda, escenario.

La sidebar (el chrome más visible, 14 ítems) es texto plano. Los grupos son labels uppercase de 9px en gris. Es el elemento más anónimo de toda la app.

### 1.5 Sin tipografía de display
Montserrat 600 es el techo. `PageHeader` usa `text-xl font-semibold`, las cifras hero del `ResultPanel` usan `text-3xl`, los KPIs `text-2xl`. En el PDF, en cambio, hay `font-weight: 800` y cifras a 23pt. La app se autolimita.

### 1.6 FOUT en cada carga
`LakautCalc.jsx:114-128` inyecta Montserrat y Open Sans por `<link>` desde unpkg en un `useEffect`. El primer segundo (el momento visceral por definición) se renderiza con `system-ui`. La primera impresión de la app es una fuente que no es la de la marca.

### 1.7 Densidad plana
Todo respira igual: `gap-6` entre bloques, `p-5` adentro. Las cotizadoras (donde hay que concentrarse en 3 decisiones) tienen el mismo ritmo que Costos (donde hay 40 inputs). No hay contraste de densidad que diga "acá pensás" vs "acá cargás datos".

---

## Nivel 2 · Conductual

### 2.1 El ResultPanel es el pico emocional y está mudo
`ResultPanel.jsx` es lo mejor pensado de la app: sticky, `AnimatedNumber` con count-up, `StatusPill` de margen, narrativa de ítems. La arquitectura emocional está bien.

Lo que falta es la expresión: card blanca igual a todas, eyebrow gris de 10px, dots de 6px, cifra a `text-3xl`. **El momento en que el vendedor ve el precio se ve igual que el formulario que lo generó.** No hay diferencia de material, ni fondo teñido, ni escala.

### 2.2 Los estados no se leen sin leer
`dealStatus.js:6-10` define tres pills que difieren solo en color (`warning` / `success` / `destructive`), misma forma y mismo peso. En una tabla de 19 filas hay que leer la palabra. Un icono (reloj / check / cruz) daría lectura preatencional.

### 2.3 Los niveles ya tienen identidad y la app la tira
En `Precios por canal` los niveles se llaman literalmente **Azul, Bronce, Plata, Oro, Platinum**. Es un sistema de materiales completo, listo para usar, con connotación de logro incorporada.

Hoy se renderiza como texto negro plano en una celda de tabla, en las 6 pantallas donde aparece (Packs, `TierHint`, Historial, Clientes, Comparación, Precios por canal) y en el PDF. Alcanzar Oro y alcanzar Bronce se ven exactamente igual.

**Esta es la oportunidad número uno de todo el relevamiento**: la única en la que el negocio ya definió la semántica y solo falta darle forma.

Lo mismo pasa con los segmentos de Volumen (Start Up, PyME, Growth, Plataforma, Ecosistema): una escalera de ambición renderizada como texto gris.

### 2.4 Vacíos sin voz
`TabInicio.jsx:90-93`: "Todavía no hay cotizaciones." / "Empezá con una de las opciones de arriba." Texto gris centrado en una card vacía. Es el primer contacto de un vendedor nuevo con la herramienta y es el momento más frío de la app.

### 2.5 No hay momento de cierre
Guardar dispara un toast. **Exportar la propuesta (el acto que completa el trabajo) no tiene ninguna respuesta emocional.** El vendedor termina la tarea y la app no se da cuenta. Nivel reflexivo perdido en el punto exacto donde el usuario merece sentir que hizo algo bien.

Tampoco hay feedback al cruzar un umbral: cuando el volumen cargado hace saltar de Plata a Oro, el nivel cambia de texto y listo. Es el mejor argumento de venta que tiene la herramienta y pasa desapercibido.

### 2.6 Roturas de material que cuestan confianza
Cada una es chica, juntas erosionan la sensación de producto terminado:

| Rotura | Ubicación | Efecto |
|---|---|---|
| 3 `<select>` nativos convivienndo con Radix Select | `TabGuardados.jsx:275`, `TabComparacion.jsx:386`, `QuoteHistory.jsx:52` | El control se ve del sistema operativo, no de la app |
| `Toast.jsx` legacy todavía en uso | `TabGuardados.jsx:6` | Dos sistemas de notificación |
| `KpiCard.jsx` (borde superior de 4px, tokens JS inline) | 0 usos: código muerto | Divergió de `StatCard`, quedó huérfano |
| Colores de gráfico hardcodeados | `TabComparacion.jsx:20`, `TabGuardados.jsx:24`, `TabConfig.jsx:125` | Ignoran `--chart-1..5`, cada pantalla su paleta |
| `TabInicio` no usa `PageHeader` | `TabInicio.jsx:49` usa `text-2xl`, el resto `text-xl` | El título de Inicio es más grande que el de todas las demás |
| `SectionCard` usado en 3 de 12 tabs | `TabGeneral`, `TabConfig`, `TabReportes` | `TabCanalesConfig` inventa su propio header numerado |
| `StatCard` con cifras largas wrappea | Clientes: "USD 350.897" a dos líneas | Rompe la lectura del KPI |
| `hero.png` sin usar | `src/assets/hero.png` + `.hero` en `App.css:20` | Resto de un diseño anterior |

### 2.7 Los canales no tienen cara
`Packs` y `Volumen` son dos negocios distintos: transaccional con precio de lista vs contrato con integración y SLA. En la interfaz son idénticos: misma card blanca en Inicio, mismo `badgeVariant: "default"` (azul) en `channelMeta.js:17,27`, mismo header, mismo panel.

`channelMeta.js` ya es fuente única de nombres. Agregarle color, icono y gradiente propaga identidad a nav, Inicio, Historial, Clientes, Reportes y PDF de una sola vez.

---

## Nivel 3 · Reflexivo

### 3.1 El producto no se presenta
`LakautCalc.jsx:238-239`: "LAKAUT" en Montserrat 18 + "Pricing Calculator" en gris 11px. Es un subtítulo de utilidad, no un nombre. El PDF, en cambio, firma como "FID by Lakaut". La app no tiene nombre propio.

### 3.2 No distingue el modo de trabajo
Cotizar, hacer seguimiento, analizar y configurar se ven igual. Son cuatro estados mentales distintos y la app los presenta con el mismo fondo, la misma card y el mismo acento. Cotizar debería sentirse con energía; configurar costos debería sentirse con calma y precisión.

### 3.3 Nada del negocio aparece visualmente
Lakaut vende confianza, identidad y firma digital. Certificados, sellos, validez legal. Ninguno de esos conceptos tiene representación visual en la app: ni sello, ni escudo, ni marca de validación, ni textura de documento. La herramienta podría ser de cualquier rubro.

### 3.4 El artefacto que ve el cliente ya resolvió esto
`exportProposal.js` tiene lo que la app no: portada `background: ${B}` full-bleed con círculos translúcidos decorativos (líneas 266-269), tarjetas con icono en contenedor redondeado, cifras a 23pt peso 800, kickers uppercase con letter-spacing, cards oscuras vs claras para jerarquizar.

**No hay que inventar un lenguaje visual: hay que traer el del PDF a la interfaz.** Eso además cierra el círculo (lo que el vendedor ve mientras cotiza se parece a lo que el cliente va a recibir).

---

## Mapa de oportunidades por componente

Ordenado por relación impacto / esfuerzo.

### Prioridad 1 · Alta señal, bajo esfuerzo — ✅ implementada (2026-07-29)

| # | Componente | Recurso | Alcance |
|---|---|---|---|
| 1 | ✅ `TierBadge` + `TierTrophy` + `lib/tierMaterial.js` | Material real por nivel: azul de marca, bronce cálido, plata frío, oro, platino iridiscente, con medallas 🥉🥈🥇. Resolución en cascada (id → keyword → posición → neutro) para niveles editados a mano. Segmentos de Volumen como escalera de ambición (🌱📈🏢🏛️🌐🪐). | Packs, Volumen, `TierHint`, Historial, Clientes, Comparación, Precios por canal (con columna "Se ve así") |
| 2 | ✅ `channelMeta.js` + `ChannelBadge` | `color`, `colorSoft`, `colorFg`, `gradient`, `glow`, `emoji`, `Icon` por canal. Packs azul 📦, Volumen violeta 🔗. Propaga a nav, cards de Inicio, badges de tabla y encabezados de Comparación (que tenía colores hardcodeados). | nav, Inicio, Historial, Clientes, Comparación |
| 3 | ✅ `dealStatus.js` + `StatusBadge` | Icono por estado (⏳ reloj / ✅ check / 🚫 cruz) en el pill y en el trigger del Select. | Inicio, Historial, Clientes |
| 4 | ✅ `.app-bg` | Opacidades de 0.07-0.10 a 0.14-0.32. Seis variantes por `data-section`: inicio, packs (azul), b2b2c (violeta), seguimiento (teal), análisis (cyan), config (neutro calmo). Aplanado en `@media print`. | toda la app |
| 5 | ✅ Fuentes | Montserrat + Open Sans auto-hospedadas vía `@fontsource` importadas en `index.css`. Se eliminó la inyección por JS desde unpkg. Nuevo peso 800 + utilidad `.font-display`. Verificado: 0 requests externos de fuente. | primer segundo |
| 6 | ✅ Sidebar | Icono por ítem, barrita de acento por grupo, y el brand header pasó a "**FID** by Lakaut · Cotizador comercial". | chrome |

Extras resueltos de paso (estaban en la tabla de roturas): `StatCard` ya no corta ni wrappea cifras largas, y se eliminaron los imports huérfanos que dejó la migración.

### Prioridad 2 · Los momentos que importan — ✅ implementada (2026-07-29)

| # | Componente | Recurso |
|---|---|---|
| 7 | ✅ `ResultPanel` | Material distinto del formulario: barra de acento del canal arriba + lavado del `glow` del canal que se desvanece hacia el blanco (el número queda sobre fondo claro), cifra hero a `text-4xl` peso 800 (`.font-display`), dots de 6→8px, eyebrow teñido. Recibe `channel`. |
| 8 | ✅ Cruce de nivel | `utils/useTierUp.js` detecta el salto hacia arriba (con `loadToken` para no festejar la carga de una cotización guardada) → `notifyTierUp` (toast con el emoji del material) + `TierTrophy` rebota con un brillo que lo barre (`animate-tier-pop` / `animate-tier-sheen`). En Packs y Volumen. |
| 9 | ✅ Export de propuesta | `notifyQuoteExported`: toast al abrir el PDF, con cliente, canal y acción "Ver en Cotizaciones" (sólo si ya está guardada). |
| 10 | ✅ Estados vacíos | `EmptyState` con glifo grande + halo y copy con voz. Distingue "todavía no hay nada" (neutro) de "los filtros no dejan ver ninguno" (tono ámbar). En Inicio, Historial, Clientes y Reportes. |
| 11 | ✅ `FieldGroup` | Paso con color del canal; con `done` el número se rellena y pasa a check. Cierra el goal gradient. |

### Prioridad 3 · Coherencia y densidad — ✅ mayormente implementada (2026-07-29)

| # | Componente | Recurso |
|---|---|---|
| 12 | ◐ Config vs Cotizar | Fondo neutro y calmo de configuración entregado en P1 (`.app-bg[data-section="config"]`). La compactación profunda del formulario vive en la reescritura de `TabConfig` (ver nota abajo). |
| 13 | ⏳ `TabConfig` (Costos) | Iconos + color por categoría (RRHH/SOP/INF/SW/OPS). Pendiente: vive en las ~480 líneas de estilos inline de `TabConfig`, el último holdout sin migrar a ShadCN. Se hace junto con esa migración, no suelto. |
| 14 | ✅ Gráficos | Paleta única en `theme/tokens.js`: `CHART_COLORS` (espeja `--chart-1..5` + extras) y `STATUS_COLORS` (semántico). `TabGuardados` y `TabReportes` la consumen; Comparación usa la identidad de canal (P1). |
| 15 | ✅ Selects nativos | Comparación migrado a Radix `Select`; el de `QuoteHistory` desapareció al borrar ese componente muerto. Queda 1 en `TabGuardados` (dentro del holdout inline; migra con `TabConfig`). |
| 16 | ✅ Limpieza | Borrados `KpiCard.jsx`, `Toast.jsx` (legacy; `TabGuardados` pasó al Toaster global), `hero.png`, `App.css` (no se importaba) y `QuoteHistory.jsx` (0 usos). |
| 17 | ✅ Tipografía de headers | `PageHeader` y el hero de Inicio usan `.font-display` (peso 800). Los títulos de página son un solo sistema. |

**Holdout pendiente (ítems 12 y 13):** `TabConfig` (Costos) y `TabGuardados` siguen con estilos inline y `theme/tokens` (BLUE/GRAY/CAT_COLOR). La reescritura a ShadCN + Crystal Glass ya estaba trackeada como pendiente antes de este relevamiento; los ítems 12 y 13 (densidad de config, iconos de categoría) y el último `<select>` nativo son parte de ese mismo trabajo y conviene hacerlos juntos, no sueltos sobre el código inline.

---

## Lo que ya está bien y conviene no tocar

→ `QuoteLayout`: el split calculadora con resultado sticky es la decisión de UX más fuerte de la app. El loop de causa-efecto funciona.
→ La narrativa en 3 pasos de las cotizadoras (propuesta → qué cotizás → condiciones). Goal gradient bien aplicado.
→ `TierHint`: convertir una tabla de referencia en herramienta de negociación en el momento exacto. Buen instinto emocional, solo le falta el material del punto 1.
→ `AnimatedNumber` / `useCountUp`: el microfeedback ya existe.
→ `channelMeta.js` como fuente única de nombres. Es la palanca que hace baratos los puntos 2 y 3.
→ El PDF. Es el techo de calidad visual del proyecto y el modelo a seguir.
