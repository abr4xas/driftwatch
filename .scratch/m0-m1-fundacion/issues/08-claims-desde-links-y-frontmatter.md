# 08: Claims de path desde links de Markdown y frontmatter

**What to build:** `path/missing` deja de mirar solo el código inline. Un link relativo roto como `[la spec](./docs/spec/SPEK.md)` y un valor de frontmatter que es una ruta inexistente se reportan igual que una ruta en backticks, con la misma precisión y las mismas reglas de descarte.

**Blocked by:** 06

**Status:** done

- [x] Los nodos `link` de mdast producen claims con `context: 'link'`
- [x] El frontmatter se parsea con `yaml`, nunca con regex, y los valores que son rutas producen claims con `context: 'frontmatter'`
- [x] Las siete reglas de descarte aplican igual a estos dos orígenes: una URL en un link no se reporta, un placeholder en frontmatter tampoco
- [x] Los links a anclas puras (`#seccion`) y a URLs se saltan acá; la verificación de anclas es `link/broken`, que es M2
- [x] El fixture `false-positive-traps` sigue en cero findings después de este cambio
- [ ] El corpus, si ya existe cuando se trabaja este ticket, se re-snapshotea y el diff se revisa a mano

## Comments

Fixture nuevo `links-y-frontmatter`, sobre un `SKILL.md` con frontmatter y links. Cubre los casos que tienen que **no** reportarse: un `name: deploy` que no es una ruta, un `plantillas/<entorno>.yml` con placeholder, un `https://` en frontmatter, un link a ancla sola (`#cierre`), un link externo, y un link con archivo más ancla (`./guias/deploy.md#pasos`) cuyo archivo sí existe. El fixture `false-positive-traps` sigue en cero.

**No se agregó `remark-frontmatter`.** El bloque inicial delimitado por `---` se recorta con una regex de tres líneas y el YAML de adentro va a `yaml`, que es un parser de verdad. `ARCHITECTURE.md` § Stack pide `yaml` explícitamente y dice "no regex" **del YAML**; recortar el bloque no es parsearlo. Eso ahorra una dependencia en el camino principal, que es lo que `AGENTS.md` § Dependencias pide verificar antes de sumar.

**Las posiciones del frontmatter se buscan por texto, no por el CST de `yaml`.** El parser expone posiciones exactas, pero llegar a ellas obliga a recorrer el CST en paralelo al árbol de datos. Para señalar una ruta alcanza con la primera aparición del valor, y el cursor avanza entre valores para que dos valores idénticos no colapsen en el mismo offset (hay un test que lo fija). Si `--fix` sobre frontmatter resulta frágil en M3, esto es lo primero que hay que cambiar.

**El offset de un link apunta a la URL completa, ancla incluida.** El texto verificado es `./guias/deploy.md`, pero lo que está escrito en el archivo es `./guias/deploy.md#pasos`, y eso es lo que `--fix` tendría que reemplazar.

## Presupuesto, medido

Con `yaml` adentro, `--version` sigue en 30 ms y una auditoría completa de este repo en 90 ms. Los presupuestos eran 80 ms de arranque en frío y 500 ms end-to-end.

Las dependencias de runtime son ahora siete: `ignore`, `picocolors`, `remark-parse`, `tinyglobby`, `unified`, `unist-util-visit`, `yaml`. `ARCHITECTURE.md` § Stack pone el techo en "~6". **Está una por encima**, y lo digo en vez de redondear para abajo. Dos atenuantes reales: `ignore` y `tinyglobby` solo se cargan en el camino sin git, que en cualquier repo real está frío; y `unified` entró como acompañante obligado de `remark-parse`, no como una elección aparte. El techo de dependencias era un proxy del presupuesto de tiempo, y el presupuesto de tiempo se cumple con margen. Si el corpus del ticket 10 muestra latencia fuera de rango, el primer candidato a sacar es `unified`, usando `mdast-util-from-markdown` directo.
