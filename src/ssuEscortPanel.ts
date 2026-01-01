import {
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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  MessageFlags,
  type TextChannel,
  type Message,
  type GuildMember,
} from "discord.js";

const SSU_ROLE_IDS = ["1442656713915367434", "1429935041076662485"]; // Special Service Unit role IDs

const SSU_CONFIRM_CUSTOM_ID = "ssu_escort_confirm";

type EscortRequestDetails = {
  escortDatetime: string;
  meetingPoint: string;
  destination: string;
  reason: string;
  otherInfo?: string;
};

const escortRequests = new Map<
  string,
  { createdById: string; details: EscortRequestDetails; assigned: Set<string> }
>();

export function buildSSUEscortPanelComponents() {
  const thumbnail = new ThumbnailBuilder()
    .setDescription("SSU Badge")
    .setURL("https://i.imgur.com/pXTy1Ww.png");

  const headerSection = new SectionBuilder()
    .setThumbnailAccessory(thumbnail)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# ㅤㅤㅤㅤㅤSpecial Service Unit"),
      new TextDisplayBuilder().setContent("# ㅤㅤㅤㅤㅤSolicitud de Escolta")
    );

  const container = new ContainerBuilder()
    .addSectionComponents(headerSection)
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "### ㅤㅤㅤㅤㅤSISTEMA DE SOLICITUD DE ESCOLTA - SSU"
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Utilice este panel para solicitar una escolta de la Special Service Unit (SSU). Complete el formulario con los datos requeridos y un agente se pondrá en contacto con usted."
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "-# Las solicitudes serán atendidas según disponibilidad operativa. Proporcione información precisa para agilizar el proceso."
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    );

  const requestButton =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ssu_escort_request")
        .setLabel("📋 Solicitar Escolta")
        .setStyle(ButtonStyle.Primary)
    );

  container.addActionRowComponents(requestButton);

  return [container];
}

export function buildSSUEscortModal() {
  const modal = new ModalBuilder()
    .setCustomId("ssu_escort_modal")
    .setTitle("Solicitud de Escolta - SSU");

  const fields = [
    new TextInputBuilder()
      .setCustomId("escort_datetime")
      .setLabel("Fecha y hora de la escolta ((GMT-0))")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("Ej: Ahora mismo / 25/12/2024 15:00"),
    new TextInputBuilder()
      .setCustomId("meeting_point")
      .setLabel("Punto de encuentro")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("Ej: Capitolio"),
    new TextInputBuilder()
      .setCustomId("destination")
      .setLabel("Lugar a trasladar/escoltar")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("Ej: Plaza de Cubos"),
    new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Motivo")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("Ej: Evento Especial"),
  ];

  const rows = fields.map((f) =>
    new ActionRowBuilder<TextInputBuilder>().addComponents(f)
  );
  modal.addComponents(...rows);
  return modal;
}

export function buildSSUEscortRequestContainer(
  userId: string,
  details: {
    escortDatetime: string;
    meetingPoint: string;
    destination: string;
    reason: string;
    otherInfo?: string;
  },
  assignedUserIds: string[] = []
) {
  const thumbnail = new ThumbnailBuilder()
    .setDescription("SSU Badge")
    .setURL("https://i.imgur.com/pXTy1Ww.png");

  const headerSection = new SectionBuilder()
    .setThumbnailAccessory(thumbnail)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 🛡️ SOLICITUD DE ESCOLTA")
    );

  const container = new ContainerBuilder()
    .addSectionComponents(headerSection)
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Solicitante:** <@${userId}>`)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Fecha y hora de la escolta ((GMT-0)):** ${details.escortDatetime}`
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Punto de encuentro:** ${details.meetingPoint}`
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Lugar a trasladar/escoltar:** ${details.destination}`
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Motivo:** ${details.reason}`)
    );

  if (details.otherInfo) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Otra información (Opcional):** ${details.otherInfo}`
      )
    );
  }

  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setSpacing(SeparatorSpacingSize.Small)
      .setDivider(true)
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Escolta/s Asignado:** ${
        assignedUserIds.length > 0
          ? assignedUserIds.map((id) => `<@${id}>`).join(" ")
          : "(Sin asignar)"
      }`
    )
  );

  const confirmRow =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(SSU_CONFIRM_CUSTOM_ID)
        .setLabel("SSU Confirmado")
        .setStyle(ButtonStyle.Success)
    );

  container.addActionRowComponents(confirmRow);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      SSU_ROLE_IDS.map((id) => `<@&${id}>`).join(" ")
    )
  );

  return [container];
}

export async function handleSSUEscortButton(
  interaction: ButtonInteraction
): Promise<boolean> {
  if (interaction.customId === "ssu_escort_request") {
    await interaction.showModal(buildSSUEscortModal());
    return true;
  }
  if (interaction.customId === SSU_CONFIRM_CUSTOM_ID) {
    const member = interaction.member as GuildMember | null;
    const hasSSURole =
      !!member && SSU_ROLE_IDS.some((rid) => member.roles.cache.has(rid));
    if (!hasSSURole) {
      await interaction.reply({
        content: "No tienes permisos para confirmar esta escolta.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const msgId = interaction.message.id;
    const req = escortRequests.get(msgId);
    if (!req) {
      await interaction.reply({
        content:
          "No se encontró la solicitud en memoria. Si el bot se reinició, vuelve a enviar la solicitud.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    req.assigned.add(interaction.user.id);
    const assignedIds = Array.from(req.assigned.values());

    await interaction.update({
      components: buildSSUEscortRequestContainer(
        req.createdById,
        req.details,
        assignedIds
      ),
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: assignedIds, roles: SSU_ROLE_IDS },
    });

    return true;
  }
  return false;
}

export async function handleSSUEscortModalSubmit(
  modal: ModalSubmitInteraction,
  targetChannelId?: string
) {
  if (modal.customId !== "ssu_escort_modal") return false;

  const details = {
    escortDatetime: modal.fields.getTextInputValue("escort_datetime"),
    meetingPoint: modal.fields.getTextInputValue("meeting_point"),
    destination: modal.fields.getTextInputValue("destination"),
    reason: modal.fields.getTextInputValue("reason"),
  };

  const channel = targetChannelId
    ? (modal.guild?.channels.cache.get(targetChannelId) as
        | TextChannel
        | undefined)
    : (modal.channel as TextChannel | null);

  if (!channel) {
    await modal.reply({
      content: "No se pudo encontrar el canal para enviar la solicitud.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const sent = (await channel.send({
    components: buildSSUEscortRequestContainer(modal.user.id, details, []),
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { roles: SSU_ROLE_IDS },
  })) as Message;

  escortRequests.set(sent.id, {
    createdById: modal.user.id,
    details,
    assigned: new Set<string>(),
  });

  await modal.reply({
    content: "✅ Su solicitud de escolta ha sido enviada correctamente.",
    flags: MessageFlags.Ephemeral,
  });

  return true;
}

export async function sendSSUEscortPanel(
  interaction: ChatInputCommandInteraction
) {
  await interaction.reply({
    components: buildSSUEscortPanelComponents(),
    flags: MessageFlags.IsComponentsV2,
  });
}

export const SSU_ROLES = SSU_ROLE_IDS;
