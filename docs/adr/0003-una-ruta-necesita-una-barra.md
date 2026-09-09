# ADR-0003 — Una ruta necesita una barra

- **Estado:** aceptada
- **Fecha:** 2026-09-08

## Contexto

Los dos documentos de la especificación se contradicen sobre si un nombre de archivo suelto cuenta como afirmación de ruta.

`docs/spec/SPEC.md` § 3 (`path/missing`) dice que algo es una ruta si cumple **alguna** de tres condiciones, y las tres exigen una barra o terminar en una:

> - Contiene `/` y un segmento final con extensión conocida.
> - Empieza con `./`, `../` o `/` y contiene `/`.
> - Termina en `/` (directorio).

`docs/spec/ARCHITECTURE.md` § "Extracción de rutas", regla 3, dice lo contrario en un paréntesis:

> Descartar si es una sola palabra sin `/` y sin extensión conocida (`foo` no es una ruta, `foo.ts` sí, `src/foo` sí).

Bajo SPEC, `` `foo.ts` `` no es una ruta. Bajo ARCHITECTURE, sí lo es.

## Decisión

Gana SPEC: **una afirmación de ruta necesita una barra, o terminar en una.** Un nombre de archivo suelto en código inline no se verifica.

## Por qué

Es la lectura que produce menos falsos positivos, y la regla que ordena todas las decisiones del proyecto dice que ante la duda se deja pasar.

Un `` `foo.ts` `` suelto en prosa casi nunca es una afirmación sobre una ruta concreta del repo. Suele ser el nombre de un archivo cuya ubicación el autor no está fijando ("cada módulo tiene su `index.ts`", "renombralo a `config.ts`"), o un ejemplo. Verificarlo contra la raíz del repo reportaría un problema donde no hay ninguno, y esa clase de ruido aparece en cualquier documento de contexto lo bastante largo.

El costo es un falso negativo real y acotado: un `` `tsconfig.json` `` que no existe en la raíz no se reporta. Es exactamente el intercambio que el proyecto declaró preferir.

## Consecuencias

- La detección de rutas queda anclada a la barra, así que el extractor nunca ve nombres sueltos y la clase entera de ruido desaparece antes de existir.
- El paréntesis de la regla 3 de `ARCHITECTURE.md` se corrigió para apuntar acá.
- Si el corpus del ticket 10 muestra que se están perdiendo problemas verdaderos por esta regla, la salida no es aflojarla en general: es agregar una condición estrecha y con su propio caso en el fixture de trampas.
