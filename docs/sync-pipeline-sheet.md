# Sincronización de clientes: Google Sheet → Cotizadora

La cotizadora dejó de tener un master de clientes manual. Ahora se alimenta del
Sheet **Sales Pipeline V2 · "DB Empresas"** (el mismo que usás como CRM). Vos
trabajás desde el Sheet y, cuando querés bajar los datos a la cotizadora, tocás
**Importar del Sheet** en la pestaña *Clientes*.

- **Fuente de verdad:** el Sheet. La cotizadora lee, no escribe.
- **Clave de indexación:** `empresa_id` (LK-E-2026-XXXX). Es el ID que ya existe
  en el Sheet, único y siempre presente. El **CUIT** y la **razón social ARCA**
  se guardan aparte y se muestran como nombre canónico cuando existen.
- **Privacidad:** el Sheet queda 100% privado. Lo lee un backend (Supabase Edge
  Function) con una cuenta de servicio de Google, no el navegador.
- **Costo:** $0. La Google Sheets API con cuenta de servicio **no** requiere
  tarjeta ni billing, y las Edge Functions entran en el plan gratuito de Supabase.

---

## Cómo funciona (resumen técnico)

```
[Sheet "DB Empresas"]  --Sheets API (cuenta de servicio)-->  [Edge Function import-pipeline]
                                                                       |
                                                             upsert por empresa_id
                                                                       v
                                              [Supabase · tabla clients]  <--  Cotizadora (botón "Importar del Sheet")
```

- Migración SQL: `supabase/migrations/0001_pipeline_sync.sql` (columnas nuevas en `clients`).
- Función: `supabase/functions/import-pipeline/index.ts`.
- Botón + lógica de front: `src/components/tabs/TabClientes.jsx` y `src/lib/useClients.js`.

La importación **no duplica**: si ya existe un cliente con ese `empresa_id` lo
actualiza; si existe un cliente cargado a mano con el mismo nombre, lo *adopta*
(le completa el `empresa_id` y conserva sus cotizaciones); si no, lo inserta.

---

## Setup (una sola vez)

Necesitás la [Supabase CLI](https://supabase.com/docs/guides/cli) instalada y
logueada (`supabase login`), y el proyecto linkeado (`supabase link`).

### 1. Correr la migración

```bash
supabase db push
```

O pegá el contenido de `supabase/migrations/0001_pipeline_sync.sql` en el SQL
Editor del Dashboard de Supabase y ejecutalo.

### 2. Crear la cuenta de servicio de Google (gratis, sin tarjeta)

1. Entrá a <https://console.cloud.google.com/> y creá un proyecto (ej. "lakaut-cotizadora").
2. **APIs y servicios → Biblioteca →** buscá **"Google Sheets API"** → **Habilitar**.
   (Esto no pide tarjeta.)
3. **APIs y servicios → Credenciales → Crear credenciales → Cuenta de servicio.**
   Ponele un nombre (ej. "cotizadora-sync"), creála. No hace falta asignarle roles.
4. Entrá a la cuenta de servicio creada → pestaña **Claves → Agregar clave → Crear
   clave nueva → JSON**. Se descarga un archivo `.json`. Guardalo bien: tiene la
   private key.
5. Copiá el **email** de la cuenta de servicio (algo como
   `cotizadora-sync@tu-proyecto.iam.gserviceaccount.com`).

### 3. Compartir el Sheet con la cuenta de servicio

En el Sheet **DB Empresas → Compartir →** pegá el email de la cuenta de servicio
con permiso de **Lector**. (Con lector alcanza; la función solo lee.)

### 4. Cargar los secrets en Supabase

Del JSON descargado sacás `client_email` y `private_key`.

```bash
supabase secrets set \
  GOOGLE_SERVICE_ACCOUNT_EMAIL="cotizadora-sync@tu-proyecto.iam.gserviceaccount.com" \
  PIPELINE_SHEET_ID="1Un5bQEU7HjvTKxTYVKWOrDBpHM910MDPs7qmueu7k1A" \
  PIPELINE_SHEET_RANGE="DB Empresas"
```

La private key tiene saltos de línea, así que cargala desde un archivo para no
romper el formato. Guardá el valor de `private_key` (incluyendo
`-----BEGIN PRIVATE KEY-----` … `-----END PRIVATE KEY-----`) en un archivo
temporal `pk.pem` y:

```bash
supabase secrets set GOOGLE_PRIVATE_KEY="$(cat pk.pem)"
rm pk.pem
```

Notas:
- `PIPELINE_SHEET_ID` es el tramo de la URL entre `/d/` y `/edit`.
- `PIPELINE_SHEET_RANGE` es el **nombre de la pestaña** (la de abajo). Si tu
  pestaña se llama distinto a "DB Empresas", poné ese nombre. Podés acotar el
  rango si querés (ej. `"DB Empresas!A1:V"`).
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase solo, no hay
  que setearlos.

### 5. Deployar la función

```bash
supabase functions deploy import-pipeline
```

Queda con `verify_jwt` activado (default), así que solo un usuario logueado en la
cotizadora puede dispararla.

---

## Uso diario

1. Cargás / editás empresas en el Sheet **DB Empresas** como siempre.
2. En la cotizadora, pestaña **Clientes → Importar del Sheet**.
3. Un toast confirma cuántas se insertaron / actualizaron.

Cuando conseguís el CUIT de una empresa, lo ideal es agregar en el Sheet dos
columnas nuevas: `cuit` y `razon_social`. La función las toma automáticamente si
existen (si no, intenta parsearlas del texto de la columna `notas`, donde hoy
algunas filas ya las tienen como "Razón social: … / CUIT: …").

### Si alguna empresa falla al importar

El toast trae **"Ver detalle (N)"**, que despliega la lista de empresas que no se
pudieron guardar, con el `empresa_id`, el nombre, un **motivo claro** y —plegado—
el **detalle técnico**. El mismo detalle queda en el panel **"Última importación"**
arriba de la pestaña Clientes (persiste entre recargas). La causa más común es un
`empresa_id` repetido en el Sheet: cada fila tiene que tener uno único.

---

## Mapeos que aplica la importación

| Sheet (`tipo`)        | Tipo cotizadora | Canal por defecto |
|-----------------------|-----------------|-------------------|
| Distribuidor          | DIS             | distribuidores    |
| Partner               | PAR             | distribuidores    |
| Cliente / Interno / — | DIR             | web               |

- El **canal** solo se setea al insertar/adoptar. Si después lo ajustás a mano en
  la cotizadora, una reimportación **no** lo pisa (el canal define pricing).
- El resto de los campos del pipeline (etapa, industria, probabilidad, DRI, tag,
  origen, notas) sí se refrescan en cada importación, porque el Sheet manda.

---

## Cómo probar la función localmente (opcional)

```bash
supabase functions serve import-pipeline --env-file supabase/.env.local
# En otra terminal, con un JWT de usuario válido:
curl -i -X POST http://localhost:54321/functions/v1/import-pipeline \
  -H "Authorization: Bearer <ACCESS_TOKEN_DE_UN_USUARIO>"
```

`supabase/.env.local` (NO se commitea — está en .gitignore) con las mismas
variables del paso 4.
