# SAGOVBot

Bot de Discord orientado a gestionar los tickets y solicitudes del **San Andreas Government Operations Agency (SAGOV)**. Automatiza la apertura, asignación y cierre de tickets temáticos, incorpora un panel especializado para escoltas de la _Special Service Unit_ (SSU) y genera transcripciones para auditoría.

## Tecnologías principales

- [Node.js](https://nodejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- [discord.js v14](https://discord.js.org/#/docs/main/stable/general/welcome) con componentes V2
- [ts-node](https://typestrong.org/ts-node/) para el modo de desarrollo
- Persistencia ligera en archivos JSON (carpeta `data/`)

## Requisitos previos

1. Node.js 20.x o superior (recomendado) y npm 10+
2. Un bot de Discord creado en [Discord Developer Portal](https://discord.com/developers/applications) con el intent de `Message Content` habilitado
3. Roles, categorías y canales ya creados en tu servidor para mapear los IDs que usa el bot

## Instalación

```bash
npm install
```

## Configuración

1. Duplica el archivo `.env.example` (o crea uno nuevo) y añade al menos la variable:

   ```bash
   DISCORD_TOKEN=
   ```

2. Ajusta los IDs ubicados en `src/index.ts` y `src/ssuEscortPanel.ts` para que coincidan con tu servidor:

   | Constante                         | Descripción                                           |
   | --------------------------------- | ----------------------------------------------------- |
   | `PARENT_CATEGORY_ID`              | Categoría principal para los tickets genéricos        |
   | `LOGS_CHANNEL_ID`                 | Canal donde se archivarán transcripciones y resúmenes |
   | `RENAME_ROLE_ID`, `CLOSE_ROLE_ID` | Roles que pueden renombrar/cerrar                     |
   | `TICKET_TYPES[*].roleIds`         | Roles mencionados y con acceso por tipo               |
   | `SSU_ROLE_IDS`                    | Roles que pueden confirmar escoltas                   |

3. (Opcional) Limpia/borra `data/counters.json` si quieres reiniciar la numeración de expedientes.

## Scripts de npm

| Script          | Descripción                                 |
| --------------- | ------------------------------------------- |
| `npm run dev`   | Ejecuta el bot con ts-node y recarga rápida |
| `npm run build` | Compila TypeScript a JavaScript en `dist/`  |
| `npm start`     | Compila y ejecuta la versión compilada      |

## Comandos de barra disponibles

| Comando                      | Uso                                                             |
| ---------------------------- | --------------------------------------------------------------- |
| `/ping`                      | Respuesta de prueba con componentes V2                          |
| `/clear count:<1-100>`       | Borra mensajes en el canal si el usuario tiene `RENAME_ROLE_ID` |
| `/paneltickets`              | Envía el panel principal para crear tickets temáticos           |
| `/openticket`                | Crea un ticket manual sin categoría                             |
| `/panelssu`                  | Envía el panel de solicitudes de escolta SSU                    |
| `/addmember member:@usuario` | Otorga acceso al canal/ticket actual si el emisor tiene permiso |

> Al iniciarse, el bot registra los comandos en todas las guilds donde está presente (`clientReady`).

## Flujo del sistema de tickets

1. **Panel de tickets (`/paneltickets`)**
   - Presenta un menú de selección con los tipos definidos en `TICKET_TYPES`.
   - Cada tipo incluye prefijos, roles etiquetados y categorías personalizadas.
2. **Generación del canal**
   - Se crea un canal privado dentro de la categoría asignada.
   - Se configura con permisos para el solicitante, staff, roles específicos y el rol con privilegios de cierre.
   - Se envía un contenedor de bienvenida con detalles del ticket y botones de acción: ping, completar, renombrar, reclamar y cerrar.
3. **Datos adicionales**
   - El tipo "Negocios" despliega un modal para recopilar información detallada que se mostrará dentro del ticket.
4. **Gestión**
   - Botones y modales permiten renombrar (`sag_rename_modal`), completar (`sag_complete_modal`) o cerrar (`sag_close_modal`).
   - Al cerrar/completar se genera un transcript (`generateTranscript`) y se publica en el canal de logs junto a un resumen visual.
5. **Persistencia**
   - El contador por tipo se guarda en `data/counters.json` para mantener la numeración (`SecInfra-001`, etc.).

## Panel SSU (Escoltas especiales)

- `/panelssu` publica un contenedor dedicado para solicitar escoltas.
- Los usuarios rellenan un modal con fecha, punto de encuentro, destino y motivo.
- Se genera un mensaje con botones donde miembros de SSU pueden confirmar la asignación.
- El estado se mantiene en memoria (`escortRequests`) durante la sesión del bot.

## Estructura de carpetas

```
SAGOVBot/
├── src/
│   ├── index.ts           # Punto de entrada y lógica de tickets
│   └── ssuEscortPanel.ts  # Componentes y flujo SSU
├── data/
│   └── counters.json      # Contadores persistentes por tipo de ticket
├── dist/                  # Salida compilada (npm run build)
├── index.js               # Loader: usa dist/ o ts-node
├── package.json
├── tsconfig.json
└── README.md
```

## Puesta en marcha

1. Configura el `.env` y los IDs de Discord.
2. Ejecuta `npm run dev` para un entorno controlado o `npm start` para producción.
3. Invita al bot a tu servidor con el scope `bot applications.commands` y los permisos de gestión de canales y mensajes.
4. Usa `/paneltickets` y `/panelssu` en los canales apropiados para desplegar los paneles.

## Resolución de problemas

- **Los comandos no aparecen:** vuelve a ejecutar el bot; en `clientReady` se registran en cada guild.
- **Error al crear canales:** confirma que `PARENT_CATEGORY_ID` y los permisos del bot son válidos.
- **Transcripciones vacías:** asegúrate de que el bot tenga permiso para leer el historial y adjuntar archivos en `LOGS_CHANNEL_ID`.
- **Solicitudes SSU pierden estado tras reiniciar:** el mapa `escortRequests` vive en memoria; reenvía el panel tras cada reinicio.

## Próximos pasos sugeridos

- Añadir pruebas automatizadas (`npm test`).
- Exponer los IDs claves mediante variables de entorno para evitar recompilar.
- Persistir las solicitudes SSU para conservar el historial tras reinicios.
