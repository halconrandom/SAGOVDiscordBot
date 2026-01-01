import "dotenv/config";
import {
  sendSSUEscortPanel,
  handleSSUEscortButton,
  handleSSUEscortModalSubmit,
} from "./ssuEscortPanel";
import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  ThumbnailBuilder,
  ActionRowBuilder,
  type MessageActionRowComponentBuilder,
  AttachmentBuilder,
  CategoryChannel,
  type Guild,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type Role,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
  type TextChannel,
  type Message,
  type Collection,
} from "discord.js";
import { promises as fs } from "fs";
import * as path from "path";
import { slashCommandData } from "./commands";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const STAFF_ROLE_NAME = "Leadership";
const PARENT_CATEGORY_ID = "1430124446575759400";
const LOGS_CHANNEL_ID = "1430124335082770482";
const RENAME_ROLE_ID = "1429936722568937574";
const CLOSE_ROLE_ID = "1449612387320856689";

const claims = new Map<string, string>();

type TicketType = {
  key: string;
  label: string;
  prefix: string;
  roleIds: string[];
  parentCategoryId?: string;
  help?: string;
};

const TICKET_TYPES: TicketType[] = [
  {
    key: "infra",
    label: "Incidencias de Infraestructura / Transporte",
    prefix: "SecInfra",
    roleIds: [
      "1439919805384884265",
      "1436389102294532198",
      "1429935039323312214",
    ],
    parentCategoryId: "1448041974178250762",
    help: "Reportes y solicitudes sobre infraestructura, transporte y servicios públicos.",
  },
  {
    key: "seg",
    label: "Asuntos de Seguridad y Emergencias",
    prefix: "HLSec",
    roleIds: ["1439919805384884265", "1429935041076662485"],
    parentCategoryId: "1448042928344924221",
    help: "Incidentes de seguridad, emergencias y coordinación operativa.",
  },
  {
    key: "neg",
    label: "Asuntos de Negocios (Licencias, Dudas, Solicitudes)",
    prefix: "SecNeg",
    roleIds: [
      "1439919805384884265",
      "1429935037528281248",
      "1429935040355373167",
    ],
    parentCategoryId: "1448042161994993877",
    help: "Gestión de licencias de negocios, consultas y solicitudes empresariales.",
  },
  {
    key: "teso",
    label: "Asuntos de Creditos de la Tesoreria",
    prefix: "Tesorero",
    roleIds: ["1439919805384884265", "1429935037528281248"],
    parentCategoryId: "1448042297210966086",
    help: "Créditos de tesorería, financiamiento y asuntos fiscales específicos.",
  },
  {
    key: "salud",
    label: "Asuntos de Salud y Educación",
    prefix: "SecSalud",
    roleIds: ["1439919805384884265", "1429935034495926284"],
    help: "Coordinación con el Departamento de Salud y Educación: atención, programas y consultas institucionales.",
  },
  {
    key: "press",
    label: "Asuntos de Prensa y Comunicaciones Públicas",
    prefix: "SecPress",
    roleIds: ["1439919805384884265", "1430305308051378387"],
    parentCategoryId: "1448042508411080744",
    help: "Prensa institucional, comunicaciones públicas y anuncios oficiales.",
  },
  {
    key: "ofic",
    label: "Comunicaciones Oficiales",
    prefix: "SecOfic",
    roleIds: ["1439919805384884265"],
    parentCategoryId: "1448042508411080744",
    help: "Comunicaciones oficiales del Ejecutivo y asuntos protocolarios.",
  },
  {
    key: "consulta",
    label: "Consultas y Dudas Generales",
    prefix: "SecCons",
    roleIds: ["1439919805384884265"],
    parentCategoryId: "1448042589340045416",
    help: "Consultas generales al Gobierno y dudas administrativas.",
  },
  {
    key: "work",
    label: "Trabaja con Nosotros",
    prefix: "SecWork",
    roleIds: ["1439919805384884265"],
    help: "Aplicaciones y solicitudes para trabajar en el Gobierno.",
  },
];

const typeCounters = new Map<string, number>();
const ticketsMeta = new Map<
  string,
  { typeKey: string; code: string; roleIds: string[]; ownerId: string }
>();

const DATA_DIR = path.join(__dirname, "..", "data");
const COUNTERS_FILE = path.join(DATA_DIR, "counters.json");

async function loadCounters() {
  try {
    const buf = await fs.readFile(COUNTERS_FILE, "utf8");
    const obj = JSON.parse(buf || "{}");
    Object.entries(obj).forEach(([k, v]) => {
      if (typeof v === "number") typeCounters.set(k, v);
    });
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(COUNTERS_FILE, "{}", "utf8");
  }
}

async function saveCounters() {
  const obj: Record<string, number> = {};
  for (const [k, v] of typeCounters.entries()) obj[k] = v;
  await fs.writeFile(COUNTERS_FILE, JSON.stringify(obj, null, 2), "utf8");
}

function nextCode(typeKey: string) {
  const current = typeCounters.get(typeKey) ?? 1;
  typeCounters.set(typeKey, current + 1);
  const type = TICKET_TYPES.find((t) => t.key === typeKey)!;
  const num = String(current).padStart(3, "0");
  void saveCounters();
  return `${type.prefix}-${num}`;
}

function nextLicenseSeq() {
  const key = "license";
  const current = typeCounters.get(key) ?? 1;
  typeCounters.set(key, current + 1);
  void saveCounters();
  return current;
}

function formatDateDDMM(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}${mm}`;
}

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function buildPanelComponents() {
  // Create the thumbnail
  const thumbnail = new ThumbnailBuilder()
    .setDescription("Seal of San Andreas")
    .setURL("https://i.imgur.com/546eTM4.png");

  // Create the section with thumbnail
  const headerSection = new SectionBuilder()
    .setThumbnailAccessory(thumbnail)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## ㅤSan Andreas Government Operations Agency\n"
      ),
      new TextDisplayBuilder().setContent(
        "## ㅤㅤㅤㅤㅤㅤGovernor Tobias F. Gray"
      ),
      new TextDisplayBuilder().setContent(
        "## ㅤㅤㅤㅤㅤSan Andreas - Government"
      )
    );

  const container = new ContainerBuilder()
    .addSectionComponents(headerSection) // Add the section directly
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "### OFICIAL REQUEST SYSTEM - SAN ANDREAS GOVERNMENT"
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Gestione aquí cualquier requerimiento institucional, dudas operativas o comunicaciones urgentes dirigidas al Ejecutivo. Cada ticket será atendido por el equipo correspondiente según la naturaleza del caso."
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "-# La estabilidad del Estado se construye atendiendo cada detalle. Utilice este canal para que su solicitud no se pierda entre despachos y sea procesada con la rapidez que exige el servicio público."
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Consulte aquí los documentos y plataformas que rigen el funcionamiento del Estado."
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Constitución del Estado")
          .setEmoji({ name: "📄" })
          .setURL(
            "https://foro.gtaw.es/forum/69-constituci%C3%B3n-de-san-andreas/"
          ),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Leyes del Estado")
          .setEmoji({ name: "📝" })
          .setURL("https://foro.gtaw.es/forum/70-leyes-de-san-andreas/"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Ordenes Ejecutivas del Estado")
          .setEmoji({ name: "📝" })
          .setURL("https://foro.gtaw.es/forum/71-ordenes-ejecutivas/"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("San Andreas Press Office")
          .setEmoji({ name: "📰" })
          .setURL("https://social.gtaw.es/pages/SAGOV?ref=qs"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Foro GTAW:ESP")
          .setEmoji({ name: "👔" })
          .setURL("https://foro.gtaw.es/topic/749-government-of-san-andreas/")
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("¿Que tipo de solicitud requiere?")
    );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `- **Infraestructura / Transporte:** Reportes sobre vías, señalización, alumbrado, obras, daños urbanos y movilidad.
- **Seguridad y Emergencias:** Incidentes de riesgo, alertas, coordinación operativa y respuesta inter-agencia.
- **Negocios (Licencias / Solicitudes):** Trámites, requisitos, regularización y dudas para comercios/organizaciones.
- **Créditos de Tesorería:** Solicitudes, seguimiento, aclaraciones, rendiciones y correcciones de registro.
- **Asuntos de Salud y Educación:** Coordinación con Salud y Educación: atención, programas y consultas institucionales.
- **Prensa y Comunicaciones Públicas:** Comunicados, agenda de prensa, coordinación con medios e información pública.
- **Comunicaciones Oficiales:** Oficios formales, documentación, coordinaciones entre entidades y respuestas oficiales.
- **Consultas Generales:** Orientación inicial y redirección cuando no aplique una categoría específica.
- **Trabaja con Nosotros:** Aplicaciones y solicitudes para trabajar en el Gobierno.`
    )
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId("sag_ticket_type")
    .setPlaceholder("Seleccione el tipo de solicitud")
    .addOptions(
      TICKET_TYPES.map((t) =>
        new StringSelectMenuOptionBuilder().setLabel(t.label).setValue(t.key)
      )
    );

  const selectorRow =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      select as unknown as MessageActionRowComponentBuilder
    );

  container.addActionRowComponents(selectorRow);

  const resetButton =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("sag_reset_panel")
        .setLabel("🔄 Reiniciar Panel")
        .setStyle(ButtonStyle.Secondary)
    );

  container.addActionRowComponents(resetButton);

  return [container];
}

function formatRoleMentions(roleIds: string[]) {
  if (!roleIds.length) return "Sin etiquetas configuradas";
  return roleIds.map((id) => `<@&${id}>`).join(" ");
}

async function generateTranscript(channel: TextChannel) {
  const lines: string[] = [];
  let lastId: string | undefined = undefined;
  while (true) {
    let fetched: Collection<string, Message<true>>;
    if (lastId) {
      fetched = (await channel.messages.fetch({
        limit: 100,
        before: lastId,
      })) as Collection<string, Message<true>>;
    } else {
      fetched = (await channel.messages.fetch({ limit: 100 })) as Collection<
        string,
        Message<true>
      >;
    }
    if (fetched.size === 0) break;
    const msgs: Message<true>[] = Array.from(fetched.values()).sort(
      (a: Message<true>, b: Message<true>) =>
        a.createdTimestamp - b.createdTimestamp
    );
    for (const m of msgs) {
      const time = new Date(m.createdTimestamp).toISOString();
      const author = m.author?.tag ?? m.author?.id ?? "unknown";
      const content = m.content || "";
      const attachments = m.attachments?.size
        ? Array.from(m.attachments.values())
            .map((att) => att.url)
            .join(" ")
        : "";
      lines.push(
        `${time} | ${author}: ${content}${attachments ? ` ${attachments}` : ""}`
      );
    }
    lastId = msgs[0]?.id;
  }
  return Buffer.from(lines.join("\n"), "utf8");
}

function buildTicketWelcomeComponents(
  ticketOwnerId: string,
  typeLabel: string,
  prefixCode: string,
  roleIds: string[],
  details?: Record<string, string>,
  typeKey?: string
) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## Bienvenido al soporte del Gobierno de San Andreas"
      ),
      new TextDisplayBuilder().setContent(
        `Este ticket ha sido creado por <@${ticketOwnerId}>. Un miembro del staff te atenderá en breve.`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Tipo de solicitud:** ${typeLabel}`
      ),
      new TextDisplayBuilder().setContent(
        `**Prefijo del expediente:** ${prefixCode}`
      ),
      new TextDisplayBuilder().setContent(
        `**Etiquetas:** ${formatRoleMentions(roleIds)}`
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        (() => {
          const t = typeKey
            ? TICKET_TYPES.find((x) => x.key === typeKey)
            : undefined;
          return t?.help
            ? `**¿Para qué es este ticket?**\n${t.help}`
            : "**¿Para qué es este ticket?**\nUso general del sistema de soporte.";
        })()
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    );

  if (details && Object.keys(details).length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("**Datos de la solicitud:**")
    );
    Object.entries(details).forEach(([k, v]) => {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`- **${k}**: ${v}`)
      );
    });
    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    );
  }

  const bottomActions =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`sag_ping_tags:${roleIds.join(",")}`)
        .setLabel("Ping Tags")
        .setEmoji({ name: "📢" })
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("sag_complete_ticket")
        .setLabel("Completar")
        .setEmoji({ name: "✅" })
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("sag_rename_ticket")
        .setLabel("Renombrar")
        .setEmoji({ name: "📝" })
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("sag_claim_ticket")
        .setLabel("Reclamar")
        .setEmoji({ name: "✋" })
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("sag_close_ticket")
        .setLabel("Cerrar")
        .setEmoji({ name: "🔒" })
        .setStyle(ButtonStyle.Danger)
    );

  container.addActionRowComponents(bottomActions);

  return [container];
}

function getParentCategory(
  guild: Guild,
  typeKey?: string
): CategoryChannel | null {
  let id = PARENT_CATEGORY_ID;
  if (typeKey) {
    const t = TICKET_TYPES.find((x) => x.key === typeKey);
    if (t && t.parentCategoryId && t.parentCategoryId.length > 0) {
      id = t.parentCategoryId;
    }
  }
  const ch = guild.channels.cache.get(id);
  if (!ch || ch.type !== ChannelType.GuildCategory) return null;
  return ch as CategoryChannel;
}

async function createTicketChannel(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | StringSelectMenuInteraction
    | ModalSubmitInteraction,
  typeKey?: string,
  details?: Record<string, string>
) {
  const guild = interaction.guild!;
  const category = getParentCategory(guild, typeKey);
  if (!category) {
    await interaction.reply({
      content: "Categoría padre no encontrada.",
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }
  const staffRole =
    guild.roles.cache.find((r: Role) => r.name === STAFF_ROLE_NAME) ??
    guild.roles.everyone;
  const baseName = `ticket-${interaction.user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const type = typeKey
    ? TICKET_TYPES.find((t) => t.key === typeKey)!
    : undefined;
  const code = typeKey ? nextCode(typeKey) : undefined;
  const nameToUse = code ? code.toLowerCase() : baseName;
  const channel = await guild.channels.create({
    name: nameToUse,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ],
      },
      {
        id: CLOSE_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      ...(typeKey === "work"
        ? []
        : [
            {
              id: staffRole.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
          ]),
      ...(type
        ? type.roleIds.map((rid) => ({
            id: rid,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          }))
        : []),
    ],
  });

  if (typeKey && type && code) {
    await channel.send({
      components: buildTicketWelcomeComponents(
        interaction.user.id,
        type.label,
        code,
        type.roleIds,
        details,
        typeKey
      ),
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { roles: type.roleIds },
    });
    ticketsMeta.set(channel.id, {
      typeKey,
      code,
      roleIds: type.roleIds,
      ownerId: interaction.user.id,
    });
  } else {
    await channel.send({
      components: buildTicketWelcomeComponents(
        interaction.user.id,
        "Sin categoría",
        "N/A",
        [],
        details,
        typeKey
      ),
      flags: MessageFlags.IsComponentsV2,
    });
  }

  // No enviar contenedor secundario; los detalles ya van en el primer contenedor
  return channel;
}

function buildTypeSelectorComponents() {
  const select = new StringSelectMenuBuilder()
    .setCustomId("sag_ticket_type")
    .setPlaceholder("Seleccione el tipo de solicitud")
    .addOptions(
      TICKET_TYPES.map((t) =>
        new StringSelectMenuOptionBuilder().setLabel(t.label).setValue(t.key)
      )
    );
  const row =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      select as unknown as MessageActionRowComponentBuilder
    );
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("¿Que tipo de solicitud requiere?")
    )
    .addActionRowComponents(row);
  return [container];
}

function buildNegociosModal() {
  const modal = new ModalBuilder()
    .setCustomId("sag_negocios_modal")
    .setTitle("Solicitud de Negocios");

  const fields = [
    new TextInputBuilder()
      .setCustomId("business_name")
      .setLabel("Nombre del Negocio / Organización")
      .setStyle(TextInputStyle.Short)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("solicitud_tipo")
      .setLabel("Tipo de solicitud")
      .setStyle(TextInputStyle.Short)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("full_name")
      .setLabel("Nombre y Apellido")
      .setStyle(TextInputStyle.Short)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("contact_number")
      .setLabel("Número de Contacto")
      .setStyle(TextInputStyle.Short)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId("description")
      .setLabel("Describa su Solicitud (opcional)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false),
  ];

  const rows = fields.map((f) =>
    new ActionRowBuilder<TextInputBuilder>().addComponents(f)
  );
  modal.addComponents(...rows);
  return modal;
}

function buildRequestDetailsContainer(
  details: Record<string, string>,
  roleIds?: string[]
) {
  const container = new ContainerBuilder();

  if (roleIds && roleIds.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(formatRoleMentions(roleIds))
    );
    container.addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent("## 📋 Detalles de la Solicitud")
  );
  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setSpacing(SeparatorSpacingSize.Small)
      .setDivider(true)
  );

  Object.entries(details).forEach(([key, value]) => {
    if (value) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${key}:**\n${value}`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );
    }
  });

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "-# Un miembro del equipo revisará su solicitud y le atenderá a la brevedad posible."
    )
  );

  const pingButton = new ButtonBuilder()
    .setCustomId(`sag_ping_tags:${roleIds?.join(",") || ""}`)
    .setLabel("📢 Ping Tags")
    .setStyle(ButtonStyle.Primary);

  const actionButtons =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      pingButton
    );

  container.addActionRowComponents(actionButtons);

  return [container];
}

function buildTicketLogComponents(
  title: string,
  meta: { code?: string },
  openedById: string,
  closedById: string,
  claimedById?: string,
  reason?: string,
  openedAt?: Date,
  closedAt?: Date
) {
  const leftThumb = new ThumbnailBuilder()
    .setDescription("Resumen")
    .setURL("https://i.imgur.com/546eTM4.png");
  const rightThumb = new ThumbnailBuilder()
    .setDescription("Operadores")
    .setURL("https://i.imgur.com/m39d7lM.png");

  const left = new SectionBuilder()
    .setThumbnailAccessory(leftThumb)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### Ticket ID\n${meta.code ? meta.code : "N/A"}`
      ),
      new TextDisplayBuilder().setContent(
        `⏰ Open Time\n${
          openedAt ? openedAt.toLocaleString("es-ES") : "Desconocido"
        }\n\n🕒 Close Time\n${
          closedAt ? closedAt.toLocaleString("es-ES") : "Desconocido"
        }`
      ),
      new TextDisplayBuilder().setContent(
        `❓ Reason\n${reason ?? "Sin motivo"}`
      )
    );

  const right = new SectionBuilder()
    .setThumbnailAccessory(rightThumb)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`✅ Opened By\n<@${openedById}>`),
      new TextDisplayBuilder().setContent(`🛑 Closed By\n<@${closedById}>`),
      new TextDisplayBuilder().setContent(
        `✋ Claimed By\n${claimedById ? `<@${claimedById}>` : "Not claimed"}`
      )
    );

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${title}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    )
    .addSectionComponents(left, right);

  return [container];
}

client.once("clientReady", async () => {
  await loadCounters();
  const jsonCommands = slashCommandData;
  for (const [, guild] of client.guilds.cache) {
    await guild.commands.set(jsonCommands);
  }
  console.log(`Bot listo como ${client.user?.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "ping") {
        const components = [
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Pong!")
          ),
        ];
        await interaction.reply({
          components,
          flags: MessageFlags.IsComponentsV2,
        });
      }
      if (interaction.commandName === "clear") {
        const member = await interaction.guild?.members.fetch(
          interaction.user.id
        );
        const hasPerm = member?.roles.cache.has(RENAME_ROLE_ID);
        if (!hasPerm) {
          await interaction.reply({
            content: "No tienes permiso para usar este comando.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const count = interaction.options.getInteger("count", true);
        const ch = interaction.channel as TextChannel | null;
        if (!ch) {
          await interaction.reply({
            content: "Este comando debe ejecutarse en un canal de texto.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        try {
          const deleted = await ch.bulkDelete(count, true);
          await interaction.reply({
            content: `Se eliminaron ${deleted.size} mensajes.`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (err) {
          await interaction.reply({
            content:
              "No se pudieron borrar mensajes. Solo se pueden borrar mensajes de los últimos 14 días.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      if (interaction.commandName === "paneltickets") {
        await interaction.reply({
          components: buildPanelComponents(),
          flags: MessageFlags.IsComponentsV2,
        });
      }
      if (interaction.commandName === "openticket") {
        const channel = await createTicketChannel(interaction);
        if (channel)
          await interaction.reply({
            content: `Ticket creado: <#${channel.id}>`,
          });
      }
      if (interaction.commandName === "panelssu") {
        await sendSSUEscortPanel(interaction);
      }
      if (interaction.commandName === "addmember") {
        const channel = interaction.channel as TextChannel | null;
        if (!channel || channel.type !== ChannelType.GuildText) {
          await interaction.reply({
            content: "Este comando solo puede usarse en canales de texto.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const executor = await interaction.guild?.members.fetch(
          interaction.user.id
        );
        const meta = ticketsMeta.get(channel.id);
        const executorHasPerm =
          executor?.roles.cache.has(RENAME_ROLE_ID) ||
          executor?.roles.cache.has(CLOSE_ROLE_ID) ||
          executor?.permissions.has(PermissionFlagsBits.ManageChannels) ||
          (meta
            ? executor?.roles.cache.some((r) => meta.roleIds.includes(r.id))
            : false);

        if (!executorHasPerm) {
          await interaction.reply({
            content: "No tienes permiso para añadir miembros a este canal.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const targetUser = interaction.options.getUser("member", true);
        const targetMember = await interaction.guild?.members
          .fetch(targetUser.id)
          .catch(() => null);

        if (!targetMember) {
          await interaction.reply({
            content: "No se pudo encontrar al miembro especificado.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await channel.permissionOverwrites.edit(targetMember.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });

        await interaction.reply({
          content: `<@${targetMember.id}> ahora tiene acceso al canal.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (interaction.isButton()) {
      if (await handleSSUEscortButton(interaction)) {
        return;
      }
      if (interaction.customId === "sag_claim_ticket") {
        claims.set(interaction.channelId, interaction.user.id);
        await interaction.reply({
          content: `Ticket reclamado por <@${interaction.user.id}>`,
          flags: MessageFlags.Ephemeral,
        });
      }
      if (interaction.customId === "sag_close_ticket") {
        const modal = new ModalBuilder()
          .setCustomId("sag_close_modal")
          .setTitle("Cerrar Ticket");
        const input = new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("Motivo del cierre")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false);
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(input)
        );
        await interaction.showModal(modal);
      }
      if (interaction.customId === "sag_reset_panel") {
        await interaction.update({
          components: buildPanelComponents(),
          flags: MessageFlags.IsComponentsV2,
        });
      }
      if (interaction.customId.startsWith("sag_ping_tags:")) {
        const roleIdsStr = interaction.customId.split(":")[1];
        const roleIds = roleIdsStr ? roleIdsStr.split(",").filter(Boolean) : [];

        if (roleIds.length > 0) {
          await interaction.reply({
            content: `${formatRoleMentions(
              roleIds
            )} - Recordatorio del ticket por solicitud de <@${
              interaction.user.id
            }>`,
            allowedMentions: { roles: roleIds },
          });
        } else {
          await interaction.reply({
            content: "No hay roles configurados para este ticket.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      if (interaction.customId === "sag_rename_ticket") {
        const meta = ticketsMeta.get(interaction.channelId);
        if (!meta) {
          await interaction.reply({
            content: "Este canal no es un ticket válido.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const member = await interaction.guild?.members.fetch(
          interaction.user.id
        );
        const hasRole =
          member?.roles.cache.has(RENAME_ROLE_ID) ||
          member?.roles.cache.some((r) => meta.roleIds.includes(r.id));
        if (!hasRole) {
          await interaction.reply({
            content: "No tienes permiso para renombrar este ticket.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const modal = new ModalBuilder()
          .setCustomId("sag_rename_modal")
          .setTitle("Renombrar Ticket");
        const input = new TextInputBuilder()
          .setCustomId("new_name")
          .setLabel("Nuevo nombre del canal")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(input)
        );
        await interaction.showModal(modal);
      }
      if (interaction.customId === "sag_complete_ticket") {
        const modal = new ModalBuilder()
          .setCustomId("sag_complete_modal")
          .setTitle("Completar Ticket");
        const input = new TextInputBuilder()
          .setCustomId("outcome")
          .setLabel("Desenlace / Resultado final")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(input)
        );
        await interaction.showModal(modal);
      }
      // Aprobar Licencia eliminado
    } else if (interaction.isStringSelectMenu()) {
      const select = interaction as StringSelectMenuInteraction;
      if (select.customId === "sag_ticket_type") {
        const typeKey = select.values[0];
        if (typeKey === "neg") {
          await select.showModal(buildNegociosModal());
        } else {
          const channel = await createTicketChannel(select, typeKey);
          if (channel) {
            await select.update({
              components: buildPanelComponents(),
              flags: MessageFlags.IsComponentsV2,
            });
            await select.followUp({
              content: `Ticket creado: <#${channel.id}>`,
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
    } else if (interaction.isModalSubmit()) {
      const modal = interaction as ModalSubmitInteraction;
      if (await handleSSUEscortModalSubmit(modal)) {
        return;
      }
      if (modal.customId === "sag_negocios_modal") {
        const details: Record<string, string> = {};

        try {
          details["Nombre del Negocio"] =
            modal.fields.getTextInputValue("business_name");
        } catch {}

        try {
          details["Tipo de solicitud"] =
            modal.fields.getTextInputValue("solicitud_tipo");
        } catch {}

        try {
          details["Nombre y Apellido"] =
            modal.fields.getTextInputValue("full_name");
        } catch {}

        try {
          details["Número de Contacto"] =
            modal.fields.getTextInputValue("contact_number");
        } catch {}

        try {
          const desc = modal.fields.getTextInputValue("description");
          if (desc) details["Descripción"] = desc;
        } catch {}

        const channel = await createTicketChannel(modal, "neg", details);
        if (channel) {
          await modal.reply({
            content: `Ticket creado: <#${channel.id}>`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      if (modal.customId === "sag_rename_modal") {
        const newName = modal.fields
          .getTextInputValue("new_name")
          .toLowerCase();
        const ch = modal.channel as TextChannel | null;
        const cid = ch?.id;
        if (!cid) {
          await modal.reply({
            content: "No se pudo identificar el canal.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const meta = ticketsMeta.get(cid);
        const member = await modal.guild?.members.fetch(modal.user.id);
        const hasRole =
          meta &&
          (member?.roles.cache.has(RENAME_ROLE_ID) ||
            member?.roles.cache.some((r) => meta.roleIds.includes(r.id)));
        if (!hasRole) {
          await modal.reply({
            content: "No tienes permiso para renombrar este ticket.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await ch?.setName(newName.replace(/[^a-z0-9-]/g, ""));
        await modal.reply({
          content: `Canal renombrado a: ${newName}`,
          flags: MessageFlags.Ephemeral,
        });
      }
      if (modal.customId === "sag_complete_modal") {
        const outcome = modal.fields.getTextInputValue("outcome");
        await modal.reply({
          content: "Ticket marcado como completado.",
          flags: MessageFlags.Ephemeral,
        });
        const ch2 = modal.channel as TextChannel | null;
        if (ch2) {
          const transcript = await generateTranscript(ch2);
          const file = new AttachmentBuilder(transcript, {
            name: `${ch2.name}-transcript.txt`,
          });
          const meta = ticketsMeta.get(ch2.id) ?? { code: ch2.name };
          const openedById = ticketsMeta.get(ch2.id)?.ownerId ?? modal.user.id;
          const logChannel = modal.guild?.channels.cache.get(
            LOGS_CHANNEL_ID
          ) as TextChannel | undefined;
          if (logChannel) {
            await logChannel.send({ files: [file] });
            await logChannel.send({
              components: buildTicketLogComponents(
                "Ticket Closed",
                meta,
                openedById,
                modal.user.id,
                claims.get(ch2.id),
                outcome,
                ch2.createdAt,
                new Date()
              ),
              flags: MessageFlags.IsComponentsV2,
            });
          }
          await ch2.delete();
        }
      }
      if (modal.customId === "sag_close_modal") {
        const ch = modal.channel as TextChannel | null;
        const reason = (() => {
          try {
            return modal.fields.getTextInputValue("reason");
          } catch {
            return "";
          }
        })();
        if (ch) {
          const transcript = await generateTranscript(ch);
          const file = new AttachmentBuilder(transcript, {
            name: `${ch.name}-transcript.txt`,
          });
          const meta = ticketsMeta.get(ch.id) ?? { code: ch.name };
          const openedById = ticketsMeta.get(ch.id)?.ownerId ?? modal.user.id;
          const logChannel = modal.guild?.channels.cache.get(
            LOGS_CHANNEL_ID
          ) as TextChannel | undefined;
          if (logChannel) {
            await logChannel.send({ files: [file] });
            await logChannel.send({
              components: buildTicketLogComponents(
                "Ticket Closed",
                meta,
                openedById,
                modal.user.id,
                claims.get(ch.id),
                reason,
                ch.createdAt,
                new Date()
              ),
              flags: MessageFlags.IsComponentsV2,
            });
          }
          await modal.reply({
            content: "Ticket cerrado y transcript enviado al canal de logs.",
            flags: MessageFlags.Ephemeral,
          });
          await ch.delete();
        }
      }
    }
  } catch (err) {
    console.error(err);
    if (interaction.isRepliable()) {
      try {
        await interaction.reply({
          content: "Ha ocurrido un error inesperado.",
          flags: MessageFlags.Ephemeral,
        });
      } catch {}
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
