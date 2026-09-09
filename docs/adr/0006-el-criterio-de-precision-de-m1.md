# ADR-0006 — El criterio de precisión de M1

- **Estado:** aceptada
- **Fecha:** 2026-09-09
- **Reemplaza:** el criterio de aceptación de `ROADMAP.md` § M1 y la línea de la puerta en `AGENTS.md` § "Orden de trabajo"

## Contexto

El criterio original decía:

> corriendo sobre un corpus de ≥10 repos públicos reales, la tasa de falsos positivos revisada a mano es < 5%.

Se midió de verdad, sobre 24 repos públicos y 111 fuentes de contexto, con tres rondas de validación fuera de muestra. El resultado está en `test/corpus/CLASIFICACION.md`. La conclusión no fue "falta ajustar": fue que **el criterio no es medible**.

## Por qué la tasa sobre findings no sirve

### 1. El denominador se derrumba justo cuando la herramienta funciona

Una herramienta precisa es callada. Después de quince correcciones, el corpus entero produce 9 findings. Un solo falso positivo sobre 9 es 11%. Para poder *distinguir* 5% de 6% hacen falta 20 findings o más, y eso exige un corpus de repos muy deteriorados o una herramienta ruidosa.

**El criterio necesita la enfermedad que pretende prevenir para poder tomarle la temperatura.**

### 2. Ordena mal los resultados

| Herramienta | Verdaderos | Falsos | Tasa | ¿Pasa? |
|---|---|---|---|---|
| A | 1 | 0 | 0% | sí |
| B | 8 | 1 | 11% | no |

B es estrictamente más útil que A y el criterio la rechaza. Cualquier métrica que prefiera A sobre B está midiendo otra cosa.

### 3. Se pasa callándose

Una herramienta que no reporta nada tiene 0% de falsos positivos. El criterio original no tiene ningún piso de cobertura, así que la forma más barata de cumplirlo es no encontrar nada.

### 4. No es lo que le pasa a una persona

Nadie corre driftwatch sobre 24 repos. Lo corre una vez, sobre el suyo. Lo que ve es un **número absoluto** de líneas dudosas en esa corrida, no una proporción global. Un 10% distribuido como "un repo con doce falsos positivos y once repos limpios" y un 10% distribuido como "un falso positivo en cada repo" son la misma cifra y dos productos distintos.

### 5. No decía dónde medir

Este es el defecto más grave, y el que no era obvio hasta medir. El criterio no exigía que la medición fuera **fuera de muestra**. Ajustar heurísticas mirando los findings de un corpus y después medir precisión sobre ese mismo corpus no mide precisión, mide cuánto se ajustó. Durante el trabajo hubo que quemar tres grupos de validación para no caer en eso.

## Decisión

El criterio de aceptación de M1 pasa a tener cuatro partes. Las cuatro se cumplen o M1 no cierra.

### A. Piso duro — la falla catastrófica

1. El fixture `false-positive-traps` cierra con **cero findings**.
2. **Cero falsos positivos entre los findings marcados `fixable`**, sobre el corpus entero.

La segunda es la que de verdad importa, y el criterio original la ignoraba por completo. Un falso positivo visible es una molestia: alguien lee la línea, se encoge de hombros y sigue. Un falso positivo **autofixable** es otra cosa: `--fix` reescribe el documento apuntando a un archivo equivocado, y el próximo agente actúa sobre esa mentira con confianza. No es ruido, es corrupción. No admite tasa: admite cero.

### B. La forma de una corrida — lo que ve una persona

Contado por repo, sobre el corpus completo:

3. **Mediana de falsos positivos por repo: 0.** La experiencia típica tiene que ser cero ruido.
4. **Percentil 90 ≤ 1.**
5. **Ningún repo con más de 2.**

Dos líneas dudosas en una corrida se perdonan. A partir de la tercera se lee como un patrón, y la persona empieza a desconfiar también de las verdaderas, que es la falla que mata el proyecto.

### C. Utilidad — para que el silencio no alcance

6. **Precisión agregada ≥ 80%** sobre el grupo de validación: como máximo un falso positivo por cada cuatro findings.
7. **Al menos un verdadero positivo en el grupo de validación.**

El 7 es el piso de cobertura que faltaba. Sin él, la forma más fácil de pasar es no reportar nada, porque una herramienta muda tiene cero falsos positivos.

Se pide sobre el grupo de validación y no sobre el corpus completo a propósito: lo que hay que demostrar es que la herramienta encuentra drift real en repos que nadie usó para ajustarla. Un verdadero positivo en un repo de calibración no prueba eso, porque las reglas se escribieron sabiendo que estaba ahí.

### Corrección de esta condición, antes de medir

La primera redacción decía "al menos un verdadero positivo por cada tres repos del corpus". Estaba mal especificada, y se corrigió antes de tomar la medición que la iba a evaluar, no después de que fallara.

El problema: la cantidad de verdaderos positivos depende de **cuánto drift tengan realmente los repos elegidos**, no de la calidad de la herramienta. Agregar cinco repos sanos al corpus habría hecho caer el ratio y "fallado" el criterio sin que nada cambiara en el código. Una vara que empeora cuando ampliás la muestra mide el corpus, no la herramienta.

La forma corregida no tiene ese problema y sigue cerrando el agujero del silencio.

### D. Metodología — dónde se mide

8. El corpus tiene **≥20 repos**, de los cuales **≥8 forman un grupo de validación** que no se miró para derivar ninguna heurística.
9. **Regla de contaminación:** si se **inspeccionan** los findings o los descartes de un repo de validación, ese repo pasa a calibración y hay que sumar uno nuevo. Las condiciones 6 y 7 se miden sobre validación; las de A y B, sobre el corpus completo.

Clasificar los findings de un repo de validación es la medición misma y no lo contamina. Lo que contamina es **mirar más de lo que la medición necesita**: abrir el repo, revisar qué descartó la herramienta, buscar el porqué. La primera redacción decía "si se usan para ajustar una regla", y es demasiado indulgente: quien vio los datos no puede desverlos, y la intención de no usarlos no es verificable por nadie. La versión estricta sí lo es, porque inspeccionar deja rastro en el trabajo.

## Por qué 80% y no 5%

El `BRIEF.md` fija la tolerancia en prosa: "una herramienta que reporta 6 problemas reales se usa todos los días; una que reporta 20 con 8 dudosos se desinstala en el primer uso".

Esos números dicen algo preciso que el 5% nunca dijo. "20 con 8 dudosos" es **60% de precisión**, y el brief lo llama intolerable. "6 problemas reales" es 100%. Así que la tolerancia real está entre 60% y 100%, y más cerca del 100%.

**El 5% quedaba fuera de ese rango por el lado imposible**, y el 60% por el lado inaceptable. El 80% es el punto más exigente que un corpus de tamaño realista puede resolver: con 10 findings admite 2 falsos, y esa es una diferencia que se puede medir a mano. El 5% con 10 findings no admite ninguno, lo que lo convierte en "cero falsos positivos" disfrazado de porcentaje.

## Honestidad sobre cómo se eligieron los umbrales

Los números de la sección B están informados por las distribuciones observadas: los conteos de falsos positivos por repo que se midieron fueron 1, 1, 1, 2 y 2 antes de las últimas correcciones, y 1 después. Elegir "mediana 0, P90 ≤ 1, máximo ≤ 2" con esos datos a la vista no es una elección a priori, y no vale fingir que lo es.

Lo que sí es a priori es la **forma** del criterio: por repo en vez de global, con piso duro separado para el autofix, con piso de cobertura, y medido fuera de muestra. Esa forma se decidió a partir de los cinco defectos de arriba, no de los números.

## Consecuencias

- El criterio deja de ser inalcanzable, sin volverse laxo: el piso duro del autofix es **más** estricto que cualquier cosa que dijera el original.
- Certificar M1 exige una medición fuera de muestra con ≥8 repos. Al momento de escribir esto no existe: de las tres rondas de validación, dos quedaron contaminadas al derivar reglas de ellas y la tercera tiene 3 repos. **M1 sigue sin cerrar**, ahora por falta de medición y no por falta de precisión.
- La regla de contaminación queda codificada en `scripts/corpus.ts`, en el campo `holdout` y su comentario, así que no depende de que alguien la recuerde.
- Si una medición futura falla la condición 6 o 7, la salida no es aflojar el umbral: es volver a las heurísticas, o aceptar que `path/missing` no llega y decirlo.
