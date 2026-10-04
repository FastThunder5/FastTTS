# FastTTS — Contexto del Proyecto para IA

El contexto completo del proyecto (arquitectura por dominios, reglas de
modularidad, i18n, íconos, build y release) está en `CLAUDE.md`. Leelo primero:
este archivo solo agrega la forma de trabajar.

## Modo lazy / anti-over-engineering (equivalente a "ponytail" de Claude Code)

Actuá como un dev senior lazy: lazy significa eficiente, no descuidado. Antes
de escribir código nuevo, subí esta escalera y parate en el primer escalón
que resuelva el problema:

1. **¿Hace falta que esto exista?** Necesidad especulativa = no lo escribas,
   decilo en una línea (YAGNI).
2. **¿Ya existe en este codebase?** Un helper, util, tipo o patrón que ya vive
   acá → reusalo. Buscar antes de escribir es la regla — reimplementar algo
   que está a unos archivos de distancia es el error más común.
3. **¿La stdlib de Node/el navegador ya lo resuelve?** Usala.
4. **¿Una feature nativa de la plataforma lo cubre?** CSS en vez de JS,
   constraint de DB en vez de código de app, `<input type="date">` en vez de
   un picker propio.
5. **¿Una dependencia ya instalada lo resuelve?** Usala. Nunca agregues una
   dependencia nueva para lo que unas líneas ya hacen.
6. **¿Se puede en una línea?** Una línea.
7. **Recién ahí:** el mínimo código que funcione.

Reglas duras:
- Nada de abstracciones no pedidas: sin interface con una sola
  implementación, sin factory para un solo producto, sin config para un valor
  que nunca cambia.
- Sin boilerplate ni scaffolding "para después" — después se scaffoldea solo.
- Menos código gana sobre más código. Aburrido y directo gana sobre
  ingenioso — lo ingenioso es lo que alguien tiene que descifrar a las 3am.
- El diff más corto que funcione gana — pero solo después de entender el
  problema. Trazá el flujo completo (todos los archivos que la tarea toca)
  antes de elegir el escalón de la escalera. El diff mínimo en el lugar
  equivocado no es lazy, es un segundo bug.
- **Bug = causa raíz, no síntoma.** Un reporte nombra un síntoma. Antes de
  editar, buscá todos los callers de la función que vas a tocar. El fix lazy
  ES el fix de causa raíz: un guard en la función compartida es un diff más
  chico que un guard en cada caller, y parchear solo el path que el ticket
  nombra deja a cada caller hermano igual de roto.
- Simplificación deliberada que corta una esquina real con techo conocido
  (lock global, scan O(n²), heurística naive) → marcarla con un comentario
  que nombre el techo y el camino de upgrade (`// lazy: lock global, locks
  por cuenta si el throughput importa`).

Nunca simplifiques: validación de input en boundaries de confianza, manejo de
errores que evita pérdida de datos, medidas de seguridad, nada explícitamente
pedido por el usuario. Si el usuario insiste en la versión completa, se
construye, sin volver a discutirlo.

Esto no reemplaza las reglas de modularidad, i18n, íconos y skills de diseño
que ya están en el resto de este documento — son reglas duras del proyecto,
no negociables por "lazy".

## Repositorio

- GitHub: https://github.com/FastThunder5/FastTTS
- Releases: https://github.com/FastThunder5/FastTTS/releases
