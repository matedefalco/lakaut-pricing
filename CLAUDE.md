# Cotizadora Lakaut — Guía para Claude Code

## Documentación del modelo comercial (fuente de conocimiento)

**Antes de responder cualquier pregunta sobre canales, precios, segmentos, descuentos o fees, leé [docs/modelo-comercial.md](docs/modelo-comercial.md).** Es la fuente única de verdad del modelo comercial y se mantiene sincronizada con el sistema.

### Cómo funciona la sincronización

→ Los números (tablas) de esa doc se **generan automáticamente** desde los valores efectivos del sistema con `npm run docs:pricing`.
→ La **fuente viva** de los números es la config de Supabase (`app_config`: keys `channelConfig`, `models`, `tcConfig`), que es lo que edita la pantalla de Config de la app. El generador la lee y aplica el mismo normalize que la app (`src/lib/channelConfigNormalize.js`), así la doc reproduce exactamente lo que el cotizador usa.
→ `src/data/channels.js` son solo **defaults / fallback**. Editarlos NO cambia lo que usa la app en producción hasta que se cargue vía la interfaz (que persiste en Supabase). Por eso la doc puede mostrar valores distintos a los del código: muestra lo vivo.

### Dos vistas de la doc, una sola fuente de tablas

Las tablas se arman con builders compartidos en **`src/lib/pricingDocSections.js`** (`buildDocBlocks` + `applyDocBlocks`), que consumen tanto el generador Node como la app:

→ **Archivo `docs/modelo-comercial.md`**: lo escribe `gen-pricing-docs.mjs` leyendo Supabase. Para lectores externos (GitHub, el equipo). Se actualiza al correr `npm run docs:pricing`.
→ **Sección Documentación en la app** (`TabDocumentacion.jsx`): la PROSA sale del `.md` (importado con `?raw`), pero las TABLAS se arman **en vivo** desde el context (`channelConfig` + `models` + `tc`). Un cambio hecho en la interfaz de Config se refleja en la doc in-app **al instante**, sin regenerar ni redeployar.

Si tocás los builders de tablas, cambian ambas vistas a la vez.

### Regla al tocar pricing

Cuando edites cualquier fuente de pricing (`src/data/channels.js`, `src/lib/channelConfigNormalize.js`, `src/data/defaultModels.js`), **regenerá la doc**:

```bash
npm run docs:pricing
```

Un hook PostToolUse (`.claude/hooks/pricing-doc-reminder.sh`) te lo recuerda automáticamente. Si el cambio se hizo desde la interfaz (Supabase), corré igual el generador para traer los valores vivos a la doc.

Para verificar que la doc no quedó desfasada (útil en CI o antes de commitear):

```bash
npm run docs:pricing:check
```

## Arquitectura de config (Supabase)

La app persiste su configuración en la tabla `app_config` de Supabase (columna `value` JSON), una fila por key:

| Key | Contenido | Contexto en la app |
|---|---|---|
| `channelConfig` | Canales, segmentos, descuentos, fees, SLA, palancas | `ChannelConfigContext` |
| `models` | Catálogo de packs del canal Web | `ModelsContext` / `defaultModels.js` |
| `costConfig` | Costos variables | `LakautCalc` |
| `discounts` | Descuentos | `DiscountContext` |
| `tcConfig` | Tipo de cambio USD→ARS | `useDolarTC` |

Cada context hace `loadConfig(key)` al montar y `saveConfig(key, …)` al editar. El default del código es solo fallback si Supabase no tiene la fila.
