# Contexto
Este proyecto es "Neón Tempestad": un roguelike de acción 2D inspirado en Risk of Rain, en HTML5 Canvas y JavaScript puro (ES6+), sin dependencias externas ni motores. Hoy hay tres archivos: `index.html`, `style.css` y `engine.js`. El motor ya tiene física 2D con plataformas, combate, subida de nivel, un bus de eventos (`Ev`), 4 personajes, 5 dificultades, élites con afijos, nodos de maestría y un jefe multifase (Coloso Prisma).

Antes de tocar nada, lee `engine.js` completo, ábrelo en un navegador y comprueba que funciona. Corrige cualquier bug que encuentres. Trabaja por fases y haz commit de git al terminar cada una.

# Reglas de arquitectura
- Mantén el stack: HTML5 Canvas + JS puro, 60 FPS, todo autocontenido.
- Separa el código en archivos: `data_characters.js`, `data_items.js`, `data_enemies.js`, `bosses.js`, `audio.js`, `touch.js`, `save.js`, `fx.js`. Si el proyecto crece, usa módulos ES (`type="module"`).
- Todo el contenido debe ser data-driven: personajes, objetos, enemigos, jefes y afijos como objetos JSON declarativos, sin lógica copiada en el motor.
- Las sinergias deben funcionar solas a través del bus de eventos (`onHit`, `onKill`, `onJump`, `onTakeDamage`, `onLevelUp`). Añade `onCast`, `onDash`, `onHeal`, `onChestOpen` y `onBossPhase`.
- Usa pools de objetos para partículas y proyectiles, para evitar tirones por el recolector de basura.

# Fase 1 — Los 20 personajes
Hay 4 hechos (Centinela, Cañonero, Tejedor, Cronista). Completa 20 jugables en 5 familias de 4: Vanguardia, Artillería, Invocadores, Manipuladores de tiempo/espacio y Malditos/Híbridos. Cada uno lleva disparo primario, habilidad secundaria, movimiento y habilidad definitiva únicos, con mecánicas distintas entre sí y no variaciones de color. Los Malditos/Híbridos deben tener riesgo/recompensa (por ejemplo gastar vida para potenciarse). Añade en el menú una pantalla de selección con familias, descripción de habilidades y personajes desbloqueables (objetivos de desbloqueo por logros).

# Fase 2 — Los 80 objetos
Crea `data_items.js` con 80 objetos acumulables (apilan con `stacks`): 35 comunes, 25 poco comunes, 12 raros, 5 legendarios (cambian las reglas del juego) y 3 míticos/prismáticos (poder extremo con costos altos). Cada objeto: id, nombre, rareza, descripción, color de icono y hooks de eventos con escalado por stacks. Diseña sinergias deliberadas entre ellos (ejemplo: sangrado + explosiones al matar + curación al matar).

Objetos Fragmentados (inspirados en los lunares de Risk of Rain), obtenibles en altares especiales: bonificaciones absurdas a cambio de una penalización permanente severa. Ejemplos:
- Corazón de Vidrio Obsidiana: daño x3.5, vida máxima fijada en 1 HP.
- Cristal de Entropía: -50% de enfriamientos, suerte a 0.
Crea al menos 10 y los altares donde se consiguen.

Añade también:
- Economía con oro y cofres (el precio sube con la dificultad; en Cataclismo los cofres cuestan +30%).
- Cofres con aparición aleatoria por rareza, y una pantalla de inventario con los objetos y stacks.
- Aviso visual claro al recoger un objeto.

# Fase 3 — Jefes, élites y niveles
- Al menos 4 jefes más, cada uno con mecánicas únicas: varias fases, barra de ruptura de guardia, ataques telegrafiados que castigan el pánico y cambios dinámicos en las plataformas.
- Prefijos de élite adicionales (al menos 8 en total) con efectos visibles y mecánicos.
- Al menos 4 escenarios con su propio mapa, plataformas, paleta, fondo parallax, enemigos propios y jefe final.
- Más tipos de enemigos (al menos 12), incluidos voladores, tiradores, kamikazes y tanques.
- Una cadena de progresión por etapas con un teletransportador y una carga de jefe, como en Risk of Rain.
- Revisa que las 5 dificultades cumplan exactamente lo especificado (cofres +30% en Cataclismo, Pesadilla Absoluta empieza al minuto 45, zonas de daño en el suelo y muerte permanente estricta con borrado de la partida).

# Fase 4 — Mejora visual (prioridad alta)
Quiero que se vea espectacular y con "game feel" profesional, siempre con gráficos procedurales, sin sprites externos:
- Efecto bloom/glow con mezcla aditiva (`globalCompositeOperation='lighter'`), más viñeta y aberración cromática ligera en golpes fuertes.
- Hit-stop (pausa de 30–60 ms) en golpes y muertes de élites y jefes, y screen-shake con intensidad configurable.
- Personajes con animación procedural más viva (squash & stretch al saltar y aterrizar, inclinación al correr, anticipación en ataques, estelas al hacer dash).
- Enemigos con diseños más reconocibles y animaciones propias, muerte con desintegración en partículas y un destello al recibir daño.
- Fondos con 3–4 capas de parallax, partículas ambientales y un ciclo de color por escenario y por fase de jefe.
- Telegraphs más claros y atractivos (rellenos que se llenan y cambian de color justo antes del impacto).
- Números de daño con distintos tamaños y colores (críticos, curación, daño recibido).
- HUD rediseñado: marcos neón, barras con degradado, iconos de objetos con color por rareza, minimapa o indicador de jefe y animaciones al subir de nivel.
- Menú principal animado, pantalla de selección más atractiva y transiciones suaves entre pantallas.
- Soporte de pantallas HiDPI/Retina con `devicePixelRatio` y escalado correcto del canvas.
- Un modo de rendimiento (calidad baja/media/alta) que desactive glow y reduzca partículas en equipos lentos.

# Fase 5 — Audio, guardado y controles
- `audio.js`: sonido 100% procedural con Web Audio API (disparos, golpes, explosiones, subida de nivel, jefes y música dinámica generada), con control de volumen y mute.
- `save.js`: persistencia en `localStorage` de personajes desbloqueados, logros, récords por dificultad y ajustes.
- `touch.js`: controles táctiles (joystick virtual, botones para saltar, secundaria, movimiento y definitiva, apuntado automático al enemigo más cercano o joystick de apuntado), detección automática de móvil y orientación horizontal.
- Soporte de mando (Gamepad API).
- Menú de pausa (Esc), opciones y pantalla de controles configurables.

# Fase 6 — Empaquetado
- Versión de escritorio con Electron (`main.js`, `package.json`, script `npm run dist` para un `.exe` portable con electron-builder).
- Versión Android con Capacitor (carpeta `www/`, `capacitor.config`, orientación horizontal bloqueada, instrucciones para generar el APK).
- README.md en español con descripción, controles, roadmap y capturas.

# Criterios de entrega
- Cada fase debe quedar jugable de principio a fin sin errores en consola.
- Prueba cada dificultad, cada personaje y cada jefe en el navegador y arregla lo que falle.
- Balance: ningún personaje ni objeto debe romper el juego por sí solo, salvo los míticos y fragmentados, que sí pueden hacerlo a cambio de su costo.
- Al terminar cada fase, resume qué hiciste, qué probaste y qué queda pendiente.

Empieza por revisar el estado actual y proponme el plan de archivos y el orden de trabajo antes de escribir código. 