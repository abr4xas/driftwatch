# El corpus

Este directorio es la única medición honesta de falsos positivos que tiene el proyecto.

## Qué hay acá

- `repos/` — clones superficiales de repos públicos, fijados a un commit. **Gitignoreado**: es cache local, se reconstruye con `pnpm corpus`.
- `snapshots/` — la salida de driftwatch sobre cada repo. **Commiteado.**
- `CLASIFICACION.md` — cada finding del corpus revisado a mano y clasificado como verdadero o falso positivo, con su justificación.

## Cómo se usa

```
pnpm corpus            clona lo que falte y reescribe los snapshots
pnpm corpus --check    falla si algún snapshot difiere del guardado
```

## Qué afirma un snapshot

**No afirma ser correcto.** Afirma no cambiar sin intención.

Un fixture verde no prueba nada sobre falsos positivos: lo escribimos nosotros, con las trampas que ya sabíamos que existían. El corpus corre la herramienta sobre archivos de contexto que escribieron otras personas, sin saber que driftwatch existe.

Cuando un snapshot cambia, el diff se revisa **a mano**, finding por finding, antes de aceptarlo. Ese diff es la única señal real de regresión de precisión.

## Por qué los commits están fijados

Sin `sha` fijo, el snapshot cambiaría cada vez que el repo de arriba se mueve, y el diff dejaría de significar "cambió driftwatch". Actualizar un pin es un cambio deliberado, con su propia revisión del diff.

## Por qué no corre en CI

Los clones son más de un gigabyte. El corpus es una compuerta local, que se corre antes de tocar las heurísticas de extracción y antes de publicar, no en cada push.
