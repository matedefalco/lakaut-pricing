# Modelo comercial y de precios — Lakaut

Documentación viva de la estructura comercial de la cotizadora. Las tablas numéricas se generan automáticamente desde los valores efectivos del sistema (Supabase + código), así que reflejan siempre lo que el cotizador usa de verdad, no un borrador.

<!-- AUTO:meta:start -->
> **Última actualización:** 2026-08-31 19:44 · **Fuente:** Supabase (config viva) · **Commit:** `1021dda`
>
> Esta sección se genera automáticamente con `npm run docs:pricing`. No editar a mano las tablas dentro de los bloques `AUTO:*`; sí se puede editar la prosa entre bloques.
<!-- AUTO:meta:end -->

---

## Cómo leer y mantener esta doc

→ **Fuente de verdad de los números:** la config viva en Supabase (`app_config`), que es lo que edita la pantalla de Config de la app y lo que persiste el código. El generador (`scripts/gen-pricing-docs.mjs`) la lee, aplica el mismo normalize que la app y reescribe las tablas.
→ **Vista in-app:** la sección Documentación dentro de la cotizadora arma estas tablas **en vivo** desde la config actual, así que un cambio hecho en la interfaz de Config se ve al instante. Este archivo (para GitHub / equipo) se actualiza al regenerar.
→ **Regenerar el archivo:** `npm run docs:pricing`. Se corre solo cuando cambia algo de pricing (un hook se lo recuerda a Claude Code), pero también podés correrlo a mano cuando editás precios desde la interfaz.
→ **Editar:** la prosa entre bloques se edita libremente. Las tablas dentro de `<!-- AUTO:* -->` se pisan en cada regeneración, no las toques a mano.

---

## Los cuatro canales

La estructura se separa en canales según **quién paga, cómo se cotiza y qué naturaleza tiene el ingreso**:

| Canal | Unidad de venta | Cómo se cotiza | Ingreso |
|---|---|---|---|
| **Web** | Pack cerrado | Precio de lista, autoservicio | Único |
| **Distribuidores** | Firma suelta (certificado bonificado) | Descuento por nivel según compromiso anual (volumen × 12), aplicado con forma de pago anual | Único |
| **IDC (B2B2C)** | IDC (bundle identidad + firma) | Precio por segmento de volumen | Recurrente mensual |
| **Volumen** | Certificado y firma sueltos | Descuento por compromiso | Único |

---

## 1. Web (venta directa)

Autoservicio desde el sitio, sin intermediación. Es el **precio de lista**, la referencia contra la que se miden los demás canales. Aplica a personas, profesionales y empresas que compran un pack cerrado.

<!-- AUTO:web:start -->
| Pack | Segmento | Firmas | Certificados | Precio (USD) | Precio (ARS aprox.) |
|---|---|---|---|---|---|
| Cero | Persona | 5 | 1 | gratis | $0 |
| Smart | Persona | 50 | 1 | USD 40,2 | $61.506 |
| Profesional | Persona | ilimitadas | 1 | USD 118,24 | $180.907 |
| PyME Smart | Empresa | 300 | 1 | USD 65,15 | $99.680 |
| PyME ilimitado | Empresa | ilimitadas | 1 | USD 156,35 | $239.216 |
| Enterprise | Empresa | ilimitadas | 5 | USD 344,63 | $527.284 |
| Integración API | Empresa | ilimitadas | — | a consultar | — |

TC de referencia usado para derivar ARS: **$1.530** por USD.
<!-- AUTO:web:end -->

---

## 2. Distribuidores e integradores

Socios que revenden el acceso a la infraestructura o la integran en su plataforma. Cotizan **por elementos sueltos**: el **certificado va siempre bonificado** y solo se cobran las firmas, a un precio base de USD 1,00. El descuento sobre la firma sale del **nivel**, que lo asigna el **compromiso anual de facturación** (calculado del volumen cotizado × 12). El descuento se aplica con forma de pago "Con compromiso anual"; con "Sin compromiso anual" la firma va a precio base. La modalidad packs (descuento sobre lista web) se descontinuó.

<!-- AUTO:distribuidores-vol:start -->
Certificados y firmas sueltos: el único modo en que cotizan los distribuidores. El **certificado va siempre bonificado** (precio USD 0,00); solo se cobran las firmas, con un precio base de **USD 1,00** por firma. El nivel (Azul→Platinum) lo asigna el **compromiso anual de facturación**, que se calcula del volumen cotizado (servicio mensual a precio base × 12), y define el descuento sobre la firma. El descuento se aplica solo con forma de pago **"Con compromiso anual"**; con **"Sin compromiso anual"** la firma va a precio base (USD 1,00). Los certificados activos son informativos (no asignan el nivel).

| Nivel | Compromiso anual (USD) | Descuento firma | Firma resultante | Certificados activos (informativo) |
|---|---|---|---|---|
| Azul | hasta USD 10.000 | 10% | USD 0,90 | hasta 100 |
| Bronce | USD 10.001 – 25.000 | 15% | USD 0,85 | 101 – 500 |
| Plata | USD 25.001 – 50.000 | 25% | USD 0,75 | 501 – 2.500 |
| Oro | USD 50.001 – 250.000 | 40% | USD 0,60 | 2.501 – 10.000 |
| Platinum | +USD 250.001 | 50% | USD 0,50 | 10.001+ |
<!-- AUTO:distribuidores-vol:end -->

---

## 3. IDC (B2B2C)

Empresas y plataformas que integran identidad y firma dentro de su propio producto vía SDK. Único canal con **ingreso recurrente mensual**.

<!-- AUTO:idc:start -->
Unidad de venta = **IDC** (Identidad Digital Certificada): bundle con biometría, emisión, custodia y firmas de activación. Es una **escala de precios**, no de descuentos: cada segmento tiene su propio precio por IDC. El segmento es el **mayor** entre dos ejes: la cantidad de IDC mensuales y la **facturación** de la ventana medida a precio de referencia Start Up (evita la circularidad precio↔segmento), windoweada por la modalidad Consumo único / Anual.

| Segmento | Rango (IDC/mes) | Facturación de la ventana | Precio IDC/mes | Firmas incluidas | Firma extra |
|---|---|---|---|---|---|
| Start Up | hasta 10.000 IDC | hasta USD 160.000 | USD 1,3438 | 3 | USD 0,50 |
| Growth | 10.001 – 50.000 IDC | USD 160.001 – 800.000 | USD 1,2404 | 3 | USD 0,50 |
| PyME | 50.001 – 200.000 IDC | USD 800.001 – 3.200.000 | USD 1,137 | 3 | USD 0,50 |
| Empresa | 200.001 – 600.000 IDC | USD 3.200.001 – 9.600.000 | USD 1,0337 | 3 | USD 0,50 |
| Plataforma | 600.001+ IDC | +USD 9.600.001 | USD 0,9303 | 3 | USD 0,50 |

Guardarraíl de rentabilidad: markup mínimo **1,20x** sobre el costo variable del bundle. Bajo ese piso el cotizador bloquea guardar y exportar.
<!-- AUTO:idc:end -->

### Fee de implementación (SDK)

<!-- AUTO:fees:start -->
Fee de implementación por SDK (pago único, bonificable a discreción comercial).

| Tier | Rango de fee | Default |
|---|---|---|
| SDK Standard | USD 1.500 – 5.000 | USD 3.250 |
| SDK Professional | USD 5.000 – 25.000 | USD 15.000 |
| SDK Enterprise | USD 25.000 – 50.000 | USD 37.500 |
<!-- AUTO:fees:end -->

---

## 4. Volumen (certificados y firmas sueltos)

Se cargan las cantidades a mano y cada elemento tiene su precio, sin bundle ni cupo. Para clientes que saben exactamente cuántos certificados y firmas necesitan. Compra única, con descuento por compromiso del contrato.

<!-- AUTO:volumen:start -->
Certificados y firmas como items independientes, sin bundle. Precio base: **cert USD 0,65 / firma USD 0,50**. El segmento es el **mayor** entre dos ejes de la cotización: el **volumen real de firmas** y el **compromiso** del contrato en USD a precio de lista, windoweado por la modalidad Consumo único / Anual. Aplica el mismo descuento sobre cert y firma.

| Segmento | Rango de firmas | Compromiso de la ventana (USD) | Descuento |
|---|---|---|---|
| Start Up | hasta 5.000 firmas | hasta USD 25.000 | 0% |
| Growth | 5.001 – 25.000 firmas | USD 25.001 – 125.000 | 5% |
| PyME | 25.001 – 100.000 firmas | USD 125.001 – 500.000 | 10% |
| Empresa | 100.001 – 300.000 firmas | USD 500.001 – 1.500.000 | 15% |
| Plataforma | 300.001+ firmas | +USD 1.500.001 | 20% |
<!-- AUTO:volumen:end -->

### Escalonado de referencia por volumen

<!-- AUTO:proyeccion:start -->
Escala estándar de referencia por volumen de firmas que se adjunta a las propuestas de Volumen (misma para todas las cotizaciones, para ser justos entre clientes).

| Tramo | Descuento sobre firma | Precio firma resultante |
|---|---|---|
| 1.000+ firmas | 2% | USD 0,49 |
| 5.000+ firmas | 3% | USD 0,485 |
| 10.000+ firmas | 5% | USD 0,475 |
| 25.000+ firmas | 10% | USD 0,45 |
| 50.000+ firmas | 15% | USD 0,425 |
| 100.000+ firmas | 20% | USD 0,40 |
<!-- AUTO:proyeccion:end -->

---

## Cómo aplican los descuentos

### Tarifa única por nivel (no marginal)

El descuento lo define el **tramo más alto que alcanza el volumen total**, y se aplica a **todo** ese volumen. No se prorratea por porciones: no es que las primeras N firmas paguen una tasa y las siguientes otra. Las tablas muestran cada nivel como un rango solo para que se lea el tramo completo, no para indicar un cálculo marginal.

### Dos formas de liquidar el descuento de nivel (Volumen y Distribuidores)

El neto anual para Lakaut es el mismo en las dos; lo que cambia es el cash flow:

→ **Forma A — Precio de lista full, beneficio al cierre.** Se factura sin descuento durante el año y al final se devuelve, como nota de crédito en dinero (A1) o como bonificación en firmas equivalentes (A2).
→ **Forma B — Pago anticipado con descuento aplicado.** Se paga el año por adelantado al valor neto (B1), o con un seguro de caución ejecutable que se reduce a medida que se paga (B2).

**IDC queda fuera:** como su segmento es una escala de precios y no de descuentos, no hay un descuento de nivel que liquidar.

### Palancas comerciales adicionales

<!-- AUTO:palancas:start -->
Descuentos adicionales (aditivos) sobre el subtotal de servicio, aplicables en Volumen y Distribuidores. Tope de la suma de las tres: **15%**.

| Palanca | Opciones (valor → descuento) |
|---|---|
| Time-to-cash (días de pago) | contado → 8% · 30 → 4% · 60 → 2% · 90 → 0% |
| Duración del contrato (meses) | 12 → 0% · 24 → 3% · 36 → 6% · 48 → 9% |
| Velocidad de cierre (días) | 15 → 4% · 30 → 2% · 60 → 100% · 90 → 0% |

Descuento del abono mensual (reposición de bolsa de firmas): **3%**. Se mantiene bajo a propósito: el beneficio principal lo da el volumen, no la recurrencia.
<!-- AUTO:palancas:end -->

---

## Servicios premium y SLA

<!-- AUTO:sla:start -->
| Plan | Precio | SLA | Volumen | Detalle |
|---|---|---|---|---|
| Standard | incluido | — | — | Horario comercial · mail y portal · respuesta hasta 8 h hábiles |
| Professional | USD 1.000/mes | 99,9% | 1.000 tx/mes | Atención extendida · prioridad media · respuesta hasta 4 h |
| Enterprise | USD 3.000/mes | 99,9% | 10.000 tx/mes | 24x7 · ejecutivo técnico · respuesta <1 h en críticos |
| SLA Dedicado | personalizado | 99,9% | — | +10.000 tx/mes · personalizado |
<!-- AUTO:sla:end -->

---

## Contexto de decisiones (vs Borrador v5)

Notas sobre por qué algunos números difieren del documento estratégico original (Borrador v5), para quien compare ambos:

→ **Precios IDC.** El Borrador v5 fijaba 0,65 → 0,45 por IDC, pero esa columna calculaba el margen contra el costo del certificado solo, ignorando que la IDC incluye 3 firmas. Con el costo real del bundle (~USD 0,77), varios segmentos vendían por debajo del costo. La escala se reconstruyó fijando el piso en 1,20x el costo y subiendo el resto en la misma proporción del documento.
→ **Distribuidores (elementos sueltos).** El certificado va siempre bonificado (precio 0): el socio no paga por el certificado, solo por las firmas, con base USD 1,00. El nivel (y su descuento sobre la firma) lo asigna el compromiso anual de facturación, calculado del volumen cotizado (servicio a precio base × 12), con los rangos y descuentos de la matriz comercial (Azul 10% → Platinum 50%). El descuento se aplica solo cuando la forma de pago es "Con compromiso anual" (pago anticipado, caución, rebate o bonificación en firmas); con "Sin compromiso anual" la firma va a precio base. El fee de implementación es configurable manualmente en todos los niveles. El costo variable del certificado se paga igual y entra al markup del deal. La antigua modalidad packs (descuento sobre la lista web) se descontinuó.
→ **Canal Volumen y formas de liquidación A/B.** No están en el Borrador v5; son construcciones posteriores del cotizador.
