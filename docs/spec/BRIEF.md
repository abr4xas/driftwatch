# driftwatch — Brief

## El problema en una frase

Los archivos de contexto para agentes (`CLAUDE.md`, `AGENTS.md`, skills, reglas de Cursor) envejecen mal: describen rutas, comandos y convenciones que el repo ya cambió, y nadie se entera hasta que un agente actúa sobre información falsa.

## Por qué duele de verdad

Un `README` desactualizado confunde a una persona, que lo nota y pregunta. Un `CLAUDE.md` desactualizado le da al agente una premisa falsa que **ejecuta con confianza**: corre un script que ya no existe, edita un archivo movido, sigue una convención abandonada. El costo no es confusión, es trabajo incorrecto sin señal de error.

Y a diferencia del código, estos archivos no tienen compilador, ni tests, ni linter. Son la única parte del repo donde mentir no tiene consecuencia mecánica.

## Qué es driftwatch

Un CLI de cero configuración que lee los archivos de contexto de agente de un repo, extrae las **afirmaciones verificables** que contienen (rutas, comandos, dependencias, símbolos, links) y comprueba cuáles ya son falsas.

```
$ npx driftwatch

CLAUDE.md
  ✗ 12  src/lib/auth.ts                  ruta no existe  → src/auth/index.ts?
  ✗ 34  pnpm run test:e2e                script no existe en package.json
  ⚠ 51  "usamos Prisma para el ORM"      no está en dependencies

.claude/skills/deploy/SKILL.md
  ✗  3  name: deployment                 no coincide con el directorio (deploy)
  ✗ 18  ./scripts/release.sh             ruta no existe

2 archivos · 5 problemas (4 errores, 1 aviso) · 340ms
```

Con `--fix` corrige lo que puede resolver sin ambigüedad. Con `--json` alimenta CI.

## Tesis: la forma de la herramienta

Esto es una herramienta, no una plataforma. Las skills y los archivos de contexto de agente ya son una forma de software: se versionan, se revisan, se rompen. Lo que todavía no tienen es tooling.

`knip` encuentra código muerto. **driftwatch encuentra contexto muerto.** Es la misma forma de herramienta aplicada a una capa nueva.

Señales de que tiene la forma correcta:
- Un solo verbo, ejecutable a diario en un loop real de trabajo.
- `npx driftwatch` sin configuración, resultado visible en segundos.
- Demo que se entiende en un GIF de 10 segundos.
- Difícil de generar con un prompt: el valor está en las heurísticas de extracción y en la tasa de falsos positivos, no en el andamiaje.

## La métrica que define el éxito

**Falsos positivos cerca de cero.** Una herramienta de linting que grita de más se desinstala en el primer uso. Es preferible reportar 6 problemas reales que 20 con 8 dudosos.

Esto es la restricción de diseño principal y ordena todas las decisiones técnicas del proyecto. Cuando haya que elegir entre cobertura y precisión, gana precisión.

## No-objetivos

- No es un linter de Markdown (no revisa estilo, formato ni ortografía).
- No juzga si el contenido es *bueno*, solo si es *cierto*.
- No usa un LLM en el camino principal. Debe correr offline, determinista y en milisegundos.
- No es un servicio, ni una app web, ni requiere cuenta.
- No reescribe prosa. `--fix` solo toca cosas mecánicamente verificables.

## Documentos de la especificación

| Archivo | Para qué |
|---|---|
| `BRIEF.md` | Este archivo: por qué existe y qué cuenta como éxito |
| `SPEC.md` | Comportamiento observable: checks, CLI, salidas, config |
| `ARCHITECTURE.md` | Cómo está construido por dentro |
| `ROADMAP.md` | Milestones con criterios de aceptación |

El handoff para el agente que construye el proyecto vive en `AGENTS.md`, en la raíz del repo.
