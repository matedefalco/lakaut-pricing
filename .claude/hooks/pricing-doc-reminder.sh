#!/bin/sh
# Hook PostToolUse: cuando se edita una fuente de pricing, le recuerda a Claude Code
# regenerar la documentación del modelo comercial. No bloquea (PostToolUse corre
# después del tool); solo inyecta additionalContext.
#
# Importante: sólo se mira el file_path del tool, NO el payload completo (el contenido
# de un archivo puede mencionar estas rutas y disparar un falso positivo).
input=$(cat)
fp=$(printf '%s' "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)
case "$fp" in
  *src/data/channels.js*|*channelConfigNormalize*|*src/data/defaultModels.js*|*scripts/gen-pricing-docs*)
    cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Tocaste una fuente de pricing de la cotizadora. Antes de cerrar la tarea, regenerá la documentación con `npm run docs:pricing` y revisá que docs/modelo-comercial.md refleje el cambio. Recordá que la fuente viva de los números es la config de Supabase: si el cambio fue solo en el código (channels.js), quizás no impacte hasta que se cargue en la app / Config; el generador lee lo vivo de Supabase.","systemMessage":"Pricing tocado → correr npm run docs:pricing"}}
JSON
    ;;
esac
exit 0
