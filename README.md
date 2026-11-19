# Neón Tempestad

Roguelike de acción 2D inspirado en *Risk of Rain*, hecho en HTML5 Canvas y JavaScript puro, sin motores ni dependencias en el juego. Todos los gráficos y sonidos se generan por código: no hay sprites ni archivos de audio.

Elige uno de 20 personajes y cruza 5 escenarios. En cada uno buscas el teletransportador, aguantas su carga y derrotas al jefe. Mientras tanto acumulas objetos que se combinan entre sí, y el reloj va subiendo la dificultad.

![Menú principal](docs/capturas/menu.png)

## Contenido

- **20 personajes en 5 familias.** Cada uno tiene disparo primario, habilidad secundaria, movimiento y definitiva propios. 16 se desbloquean con logros.

  | Familia | Personajes |
  |---|---|
  | Vanguardia | Centinela, Bastión, Duelista, Titán |
  | Artillería | Cañonero, Demoledora, Ojo de Halcón, Voltaica |
  | Invocadores | Tejedor, Exhumador, Mecánica, Colmena |
  | Tiempo/Espacio | Cronista, Paradoja, Gravitón, Umbral |
  | Malditos/Híbridos | Hemomante, Berserker, Poseído, Quimera (riesgo/recompensa: gastan vida para potenciarse) |

- **Objetos.** Hay 90 acumulables: 35 comunes, 25 poco comunes, 18 raros, 9 legendarios y 3 míticos. Diez de ellos son **originales que cambian las reglas**: Corazón de la Tormenta, Espejo de Causalidad, Contrato del Vacío, Reloj Roto, Núcleo Parasitario, Memoria Artificial, Prisma Inestable, Corona del Último Rey, Fragmento de Destino y Parásito de Dimensión. Además hay 12 objetos fragmentados, que dan bonificaciones absurdas a cambio de una penalización permanente y se consiguen en altares.
- **Economía.** Oro y cofres de varias rarezas. El precio sube con la dificultad, y en Cataclismo los cofres cuestan un 30% más.
- **Escenarios y jefes.**

  | Escenario | Jefe |
  |---|---|
  | Ruinas de Neón | Coloso Prisma |
  | Fundición Carmesí | Hidra de Cables |
  | Necrópolis Espectral | Reina Espectral |
  | Abismo Digital | Leviatán de Datos |
  | Núcleo de la Tempestad | Arconte de la Tempestad |

  Cada jefe tiene 3 fases (ningún golpe puede saltarse una), barra de ruptura de guardia, ataques telegrafiados que castigan el pánico y plataformas que cambian durante el combate.
- **Modo Infinito.** Tras cada jefe, el teletransportador abre un portal dual:
  - **izquierda — Terminar run:** guarda la puntuación en la clasificación;
  - **derecha — Siguiente etapa**, o tras la etapa 5 **Continuar ciclo (Loop +1)**.

  Cada loop vuelve a la etapa 1 con otra atmósfera (Eclipse, Ceniza Tóxica, Aurora Sangrienta, Vacío Blanco…). En cada uno:
  - la dificultad se multiplica ×1,45;
  - la densidad de enemigos, ×1,5;
  - cada jefe llega acompañado de otro;
  - los topes de armadura, esquiva y enfriamientos suben hasta el 95%, para que los objetos acumulados terminen rompiendo el juego.
- **Combate.**
  - **Parry** (F · LB en mando · botón ⛨ en táctil): ventana de 0,2 s que anula el golpe, devuelve el proyectil y cura una herida. Cada familia responde distinto: Vanguardia contraataca, Artillería devuelve todos los proyectiles cercanos, Invocadores reciben dos drones, Tiempo/Espacio ralentiza alrededor y Malditos absorben vida y daño.
  - **Ejecuciones** (Interactuar junto a un enemigo debilitado, marcado con un rombo rojo): lo rematan dando vida, oro y energía.
  - **Combos**: golpes encadenados suben el daño (hasta +30%); en el aire cuentan doble y dejan a los enemigos suspendidos.
  - **Sobrecarga**: habilidades, parries, ejecuciones y combos cargan energía; al 100% hay 6 s de habilidades potenciadas y después agotamiento.
  - **Ataques contextuales**: más daño en el aire, desde arriba, justo después de un movimiento y contra enemigos aturdidos.
  - **Heridas**: algunos enemigos y jefes dejan fractura, infección, interferencia o desgarro durante 5 s.
- **Enemigos que cambian.**
  - **Armaduras**: Brutos, Gólems y Acorazados llevan placas que absorben el 60% del daño; rotas, el enemigo es más rápido y frágil y el Acorazado pierde su escudo.
  - **Evolución**: un enemigo que sobrevive 20 s (y otra vez a los 40 s) evoluciona con más vida, daño, velocidad y un rasgo (regenera, coraza, veloz o feroz). Vale más.
  - **Devoradores**: Gólems, Gelatinas y Chamanes absorben a los caídos cercanos: se curan, crecen y evolucionan antes.
  - **Cazador del Vacío**: desde la etapa 2 puede aparecer un cazador único que huye herido y vuelve en otra etapa más fuerte; a la tercera pelea hasta el final y deja un objeto legendario.
- **Neutrales e IA adaptativa.**
  - **Mercader errante**: vende dos objetos a la vista (poco común o raro) por oro.
  - **Ermitaño**: propone una misión (cacería, verdugo, reflejos, intocable o virtuoso) que recompensa con un objeto raro y oro.
  - **Eco Imitador**: enemigo que copia la última habilidad que usaste (disparo, embestida, salto tras de ti o explosión).
  - **Jefes que recuerdan**: observan tu distancia, tiempo en el aire, esquivas y habilidad favorita, y en cada fase suman una respuesta telegrafiada a ese estilo.
- **Elementos.** Cinco elementos de daño (fuego, rayo, vacío, plasma, corrupción) y el estado de hielo. Cada héroe golpea con el suyo; cada enemigo y jefe tiene una debilidad (×1,5) y una resistencia (×0,6), y el plasma nunca es resistido. Las **reacciones** premian combinar: rayo sobre un enemigo helado (Resonancia, salta a los vecinos), fuego sobre helado (Choque Térmico), fuego sobre envenenado (Combustión) y vacío sobre electrizado (Colapso, atrae y aturde).
- **Enemigos.** 15 tipos (voladores, tiradores, kamikazes, tanques, etc.) y 11 afijos de élite.
- **Dificultades.**

  | Dificultad | Efecto |
  |---|---|
  | Paseo Estelar | Reloj un 30% más lento y 1 resurrección |
  | Estándar | Sin modificadores |
  | Tormenta de Riesgo | Reloj +25%, élites +40%, curación −20% |
  | Cataclismo | Reloj +60%, cofres +30%, élites con doble afijo |
  | Pesadilla Absoluta | Empieza en el minuto 45 con nivel 20 y 24 objetos. Los proyectiles dejan zonas de daño en el suelo. Muerte permanente: al morir se borra la partida |

- **Aspecto y sonido.**
  - Imagen: bloom, viñeta, aberración cromática, hit-stop, temblor de pantalla configurable, animación procedural, parallax de 4 capas y soporte HiDPI.
  - Calidad gráfica alta, media o baja.
  - Música y efectos sintetizados con Web Audio. La música cambia al cargar el teletransportador y al pelear contra el jefe.
- **Cuentas y clasificación online (Firebase).**
  - Una cuenta, con usuario y contraseña, sirve en cualquier dispositivo.
  - Ranking global con una pestaña por dificultad: posición, usuario, personaje, nivel, loop, tiempo y puntuación. Compite con tus amigos.
  - Sin conexión se juega igual: las partidas quedan en cola y se suben al volver la red.
  - Mientras haya pocas partidas reales, la tabla se completa con jugadores ficticios, atenuados y marcados «IA», que no cuentan para tu puesto.
  - Las reglas del servidor solo permiten publicar con tu propio nombre y con valores razonables. Nadie puede editar ni borrar puntuaciones.
- **Personajes articulados.** Cada héroe tiene esqueleto (cabeza, torso, piernas y brazos animados), una capa con física y un arma que apunta al cursor. Además lleva equipo propio: los aros del Cronista, los planos holográficos de la Mecánica, la cola de la Quimera, etc.
- **La Tempestad.** Cada etapa tiene una **estabilidad dimensional** (100 → 0) que erosionan el tiempo, las bajas de élites, las definitivas y las fases de jefe.
  - Al cruzar 75, 25 y 0 se desata una **anomalía**: gravedad baja, tormenta eléctrica, lluvia de meteoritos, proyectiles acelerados, enemigos tormentosos o niebla dimensional. Algunas etapas ya empiezan en plena tormenta.
  - Dos anomalías concretas se **combinan** en un efecto nuevo (gravedad baja + tormenta eléctrica = orbes eléctricos flotantes).
  - Al cruzar 50, la Tempestad ofrece un **trato**: estabilizar (menos enemigos, objeto poco común), alimentar (otra anomalía y más enemigos, objeto raro y +50% de oro) o absorber (60 s de poder con consecuencia).
- **Tienda de cosméticos.**
  - Con los cristales 💎 que ganas al terminar cada partida (según la puntuación) compras cosméticos puramente visuales: 9 skins, 7 estelas y 6 auras.
  - La vista previa los muestra en movimiento antes de comprarlos.
- **Pantalla de inicio.** Logo animado, desfile de héroes con tus cosméticos equipados y accesos a jugar, tienda, ranking y opciones.
- **Guardado.** Logros, desbloqueos, récords por dificultad, ajustes y la partida en curso, que se puede continuar desde el inicio de la etapa.

![Selección de personaje](docs/capturas/seleccion.png)
![Hidra de Cables](docs/capturas/jefe-hidra.png)
![Arconte de la Tempestad](docs/capturas/jefe-arconte.png)
![Inventario](docs/capturas/inventario.png)

## Controles

Todas las teclas se pueden reasignar en **🎮 Controles**, desde el menú o desde la pausa.

| Acción | Teclado y ratón | Mando (Xbox / PlayStation) |
|---|---|---|
| Moverse | A / D o ← / → | Stick izquierdo o cruceta |
| Saltar (doble salto) | Espacio, W o ↑ | A / ✕ |
| Bajar de plataforma | S o ↓ | Stick abajo |
| Disparo primario | Clic izquierdo (apunta con el ratón) | RT o stick derecho (apunta) |
| Habilidad secundaria | Clic derecho | LT |
| Movimiento | Shift | B / ○ o RB |
| Definitiva | Q | Y / △ o LB |
| Interactuar (cofres, altares, teletransportador) | E | X / □ |
| Inventario | Tab o I | Select |
| Pausa | Esc o P | Start |
| Silenciar | M | — |

**En móvil:**
- Los controles táctiles aparecen solos: un joystick donde apoyes el dedo y botones para cada acción.
- El apuntado puede ser automático (al enemigo más cercano) o con un segundo joystick. Se elige en **⚙ Opciones**.
- El juego se juega en horizontal.

![Controles táctiles](docs/capturas/tactil.png)

## Jugar

**En el navegador:** abre `html/index.html`. No necesita servidor ni instalación.

Hay dos parámetros de URL para pruebas:
- `html/index.html?unlockall`: desbloquea todos los personajes y salta la pantalla de cuenta.
- `html/index.html?guest`: entra directamente como invitado.
- `html/index.html?debug`: la tecla B activa el teletransportador.

## Desarrollo

Hace falta Node.js 18 o superior.

```bash
npm install          # Electron, electron-builder y Capacitor (solo para empaquetar)
npm test             # pruebas automáticas sin navegador: personajes × dificultades × etapas
npm run test:browser # prueba en Chrome/Edge/Brave real: capturas, FPS y errores de consola
```

### Escritorio (Windows, instalador)

```bash
npm start      # abre el juego en una ventana de Electron (F11 pantalla completa)
npm run dist   # genera dist/NeonTempestad-Setup-<versión>.exe (y borra los de versiones anteriores)
```

El instalador no pide permisos de administrador. Instala el juego en `%LOCALAPPDATA%\Programs
eon-tempestad`, con acceso directo en el escritorio y en el menú Inicio. Cada versión nueva **se instala encima de la anterior**, y las partidas y la configuración (guardadas en el perfil del usuario) se conservan.

`npm run dist` construye en una carpeta temporal y solo copia el `.exe` a `dist/`. Así evita el bloqueo con el que VS Code deja abiertos los `.asar` dentro del proyecto.

> Si `npm start` abre una consola de Node en vez del juego, la variable de entorno `ELECTRON_RUN_AS_NODE` está activa (la terminal integrada de VS Code la define). Lánzalo desde otra terminal o con `env -u ELECTRON_RUN_AS_NODE npm start`.

### Android (APK con Capacitor)

```bash
npm run apk    # genera dist/NeonTempestad-<versión>.apk firmado, listo para instalar
```

**Requisitos:** JDK 21 y SDK de Android. Hay dos formas de tenerlos:
- Instalar [Android Studio](https://developer.android.com/studio) y definir `JAVA_HOME` y `ANDROID_HOME`.
- Usar las versiones portátiles de `%LOCALAPPDATA%
eon-android`, que es lo que hace el script si no encuentra esas variables.

**Firma:** la primera vez se crea una clave en `~/.neon-tempestad/` (`release.jks` y `keystore.json`).
> ⚠️ **Haz una copia de seguridad de esa carpeta y no la subas al repositorio.** Android solo instala una actualización encima de la anterior si está firmada con la misma clave. Si la pierdes, cada jugador tendrá que desinstalar el juego (y perder su progreso) para instalar la siguiente versión.

Para abrir el proyecto en Android Studio: `npm run android && npm run android:open`.

**Notas:**
- `tools/android-setup.js` bloquea la orientación horizontal en `AndroidManifest.xml` con `sensorLandscape`, y copia el icono y la pantalla de carga.
- Además, el juego pide pantalla completa en horizontal al tocar la pantalla.
- Cada vez que cambies el código del juego, vuelve a ejecutar `npm run android`.

### Publicar una actualización (obligatoria)

**Cómo funciona:**
- **Escritorio:** el botón «Actualizar ahora» descarga el instalador nuevo de la release y comprueba su huella SHA-256, publicada en `version.json`. Después lo instala encima en silencio y vuelve a abrir el juego. Si algo falla, abre la página de descargas.
- **Android:** descarga el APK nuevo directamente. Al abrirlo se instala encima, porque está firmado con la misma clave.
- Al abrirse, y cada 30 minutos, el juego lee [`version.json`](version.json) de la rama `main` de GitHub.
- Si la versión instalada es menor que `min`, aparece una pantalla de **actualización obligatoria**. No se puede cerrar y lleva a la página de descarga.
- Si llega en mitad de una partida, espera a que termine.
- Sin conexión se puede seguir jugando.

**Sacar una versión nueva (un solo comando):**
```bash
npm run release -- 1.3.0 "Qué trae esta versión"
```
El comando hace todo esto en orden:
1. Comprueba que estás en `desarrollo`, sin cambios pendientes, y que las pruebas pasan.
2. Sube la versión y genera el instalador `.exe` y el APK. Antes borra de `dist/` los de versiones anteriores, y publica la huella del instalador en `version.json`.
3. Hace commit y push, y crea la release `v1.3.0` en GitHub con los dos archivos.
4. Por último lleva `desarrollo` a `main`. Desde ese momento, todas las copias anteriores quedan bloqueadas hasta actualizar.

Necesita la herramienta [`gh`](https://cli.github.com) con la sesión iniciada (`gh auth login`), además de los requisitos del `.exe` y del APK. El orden importa: `version.json` llega a `main` solo cuando la descarga ya existe.

### Icono y pantalla de carga

El icono del `.exe` (`build/icon.png`), los iconos de Android y su pantalla de carga (`build/android/res/`) también se dibujan por código. Para regenerarlos después de cambiar el diseño en `tools/make-icons.js`, ejecuta `node tools/make-icons.js`. Hace falta Chrome, Edge o Brave.

### Servidor (Firebase)

El proyecto de Firebase es `neon-tempestad`. Usa **Authentication** (correo y contraseña; el juego convierte el usuario en `usuario@neontempestad.game`) y **Firestore**, con la clasificación en `boards/{0-4}/scores`. Las reglas de seguridad están en la consola de Firebase, en Firestore › Reglas. El juego habla con la API REST directamente, sin librerías, y la `apiKey` va en `js/auth.js`: no es secreta, lo que protege los datos son las reglas.

Para borrar una puntuación (trampas, pruebas…) entra en la consola de Firebase › Firestore › `boards` › dificultad › `scores` y elimina el documento.

### Estructura

| Archivo | Contenido |
|---|---|
| `html/index.html` | Página del juego (carga `../css` y `../js`) |
| `css/style.css` | Estilos de menús y pantallas |
| `js/engine.js` | Estado, física, combate, bucle principal |
| `js/renderer.js` | Dibujo procedural: héroes articulados, enemigos, luz aditiva, sacudida direccional |
| `js/fx.js` | Pools de partículas y proyectiles, post-procesado, números de daño |
| `js/data_characters.js`, `js/data_items.js`, `js/data_enemies.js`, `js/data_stages.js` | Contenido declarativo |
| `js/abilities.js`, `js/loot.js`, `js/enemies.js`, `js/bosses.js`, `js/stages.js` | Lógica de habilidades, objetos, enemigos, jefes y escenarios |
| `js/audio.js`, `js/save.js`, `js/input.js`, `js/touch.js`, `js/ui.js` | Sonido, guardado, controles, táctil, interfaz |
| `js/auth.js` | Cuentas y clasificación online (Firebase), puntuación |
| `js/update.js`, `version.json` | Comprobación de versión y actualización obligatoria |
| `js/main.js`, `js/preload.js`, `js/updater.js` | Ventana de escritorio (Electron) y actualización automática verificada |
| `js/cosmetics.js` | Tienda: skins, estelas y auras |
| `js/elements.js` | Elementos: debilidades, resistencias y reacciones |
| `js/combat.js` | Parry, ejecuciones, combos, sobrecarga, contexto y heridas |
| `js/ecology.js` | Armaduras, evolución, devoradores y el Cazador del Vacío |
| `js/adaptive.js`, `js/npcs.js` | IA adaptativa (imitador, jefes que recuerdan) y neutrales (mercader, ermitaño y misiones) |
| `js/storm.js` | La Tempestad: estabilidad, anomalías, combinaciones y tratos |
| `tools/` | Pruebas (`smoke.js`, `browser.js`) y scripts de empaquetado |

Las sinergias entre objetos van por un bus de eventos: `onHit`, `onKill`, `onJump`, `onTakeDamage`, `onLevelUp`, `onCast`, `onDash`, `onHeal`, `onChestOpen` y `onBossPhase`.

## Hoja de ruta

**Hecho**
- [x] Fase 1: los 20 personajes y la selección con desbloqueos por logros.
- [x] Fase 2: los 80 objetos, los fragmentados con sus altares, la economía y el inventario.
- [x] Fase 3: los 5 escenarios y sus jefes, 15 enemigos, 11 afijos, el teletransportador y las 5 dificultades.
- [x] Fase 4: mejora visual y *game feel*.
- [x] Fase 5: audio, guardado, controles configurables, mando y controles táctiles.
- [x] Fase 6: escritorio con Electron, Android con Capacitor y este README.
- [x] Carpetas por extensión, cuentas con clasificación, héroes articulados y Modo Infinito.

**Pendiente**
- [ ] Probar en móviles y mandos reales: ajustar el tamaño de los botones táctiles y la sensibilidad.
- [ ] Más escenarios.
