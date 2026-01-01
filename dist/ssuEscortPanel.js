"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSU_ROLES = void 0;
exports.buildSSUEscortPanelComponents = buildSSUEscortPanelComponents;
exports.buildSSUEscortModal = buildSSUEscortModal;
exports.buildSSUEscortRequestContainer = buildSSUEscortRequestContainer;
exports.handleSSUEscortButton = handleSSUEscortButton;
exports.handleSSUEscortModalSubmit = handleSSUEscortModalSubmit;
exports.sendSSUEscortPanel = sendSSUEscortPanel;
const discord_js_1 = require("discord.js");
const SSU_ROLE_IDS = ["1442656713915367434", "1429935041076662485"]; // Special Service Unit role IDs
const SSU_CONFIRM_CUSTOM_ID = "ssu_escort_confirm";
const escortRequests = new Map();
function buildSSUEscortPanelComponents() {
    const thumbnail = new discord_js_1.ThumbnailBuilder()
        .setDescription("SSU Badge")
        .setURL("https://i.imgur.com/pXTy1Ww.png");
    const headerSection = new discord_js_1.SectionBuilder()
        .setThumbnailAccessory(thumbnail)
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent("# ㅤㅤㅤㅤㅤSpecial Service Unit"), new discord_js_1.TextDisplayBuilder().setContent("# ㅤㅤㅤㅤㅤSolicitud de Escolta"));
    const container = new discord_js_1.ContainerBuilder()
        .addSectionComponents(headerSection)
        .addSeparatorComponents(new discord_js_1.SeparatorBuilder()
        .setSpacing(discord_js_1.SeparatorSpacingSize.Small)
        .setDivider(true))
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent("### ㅤㅤㅤㅤㅤSISTEMA DE SOLICITUD DE ESCOLTA - SSU"))
        .addSeparatorComponents(new discord_js_1.SeparatorBuilder()
        .setSpacing(discord_js_1.SeparatorSpacingSize.Small)
        .setDivider(true))
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent("Utilice este panel para solicitar una escolta de la Special Service Unit (SSU). Complete el formulario con los datos requeridos y un agente se pondrá en contacto con usted."))
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent("-# Las solicitudes serán atendidas según disponibilidad operativa. Proporcione información precisa para agilizar el proceso."))
        .addSeparatorComponents(new discord_js_1.SeparatorBuilder()
        .setSpacing(discord_js_1.SeparatorSpacingSize.Small)
        .setDivider(true));
    const requestButton = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId("ssu_escort_request")
        .setLabel("📋 Solicitar Escolta")
        .setStyle(discord_js_1.ButtonStyle.Primary));
    container.addActionRowComponents(requestButton);
    return [container];
}
function buildSSUEscortModal() {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId("ssu_escort_modal")
        .setTitle("Solicitud de Escolta - SSU");
    const fields = [
        new discord_js_1.TextInputBuilder()
            .setCustomId("escort_datetime")
            .setLabel("Fecha y hora de la escolta ((GMT-0))")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("Ej: Ahora mismo / 25/12/2024 15:00"),
        new discord_js_1.TextInputBuilder()
            .setCustomId("meeting_point")
            .setLabel("Punto de encuentro")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("Ej: Capitolio"),
        new discord_js_1.TextInputBuilder()
            .setCustomId("destination")
            .setLabel("Lugar a trasladar/escoltar")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("Ej: Plaza de Cubos"),
        new discord_js_1.TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Motivo")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("Ej: Evento Especial"),
    ];
    const rows = fields.map((f) => new discord_js_1.ActionRowBuilder().addComponents(f));
    modal.addComponents(...rows);
    return modal;
}
function buildSSUEscortRequestContainer(userId, details, assignedUserIds = []) {
    const thumbnail = new discord_js_1.ThumbnailBuilder()
        .setDescription("SSU Badge")
        .setURL("https://i.imgur.com/pXTy1Ww.png");
    const headerSection = new discord_js_1.SectionBuilder()
        .setThumbnailAccessory(thumbnail)
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent("## 🛡️ SOLICITUD DE ESCOLTA"));
    const container = new discord_js_1.ContainerBuilder()
        .addSectionComponents(headerSection)
        .addSeparatorComponents(new discord_js_1.SeparatorBuilder()
        .setSpacing(discord_js_1.SeparatorSpacingSize.Small)
        .setDivider(true))
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`**Solicitante:** <@${userId}>`))
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`**Fecha y hora de la escolta ((GMT-0)):** ${details.escortDatetime}`))
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`**Punto de encuentro:** ${details.meetingPoint}`))
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`**Lugar a trasladar/escoltar:** ${details.destination}`))
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`**Motivo:** ${details.reason}`));
    if (details.otherInfo) {
        container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`**Otra información (Opcional):** ${details.otherInfo}`));
    }
    container.addSeparatorComponents(new discord_js_1.SeparatorBuilder()
        .setSpacing(discord_js_1.SeparatorSpacingSize.Small)
        .setDivider(true));
    container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`**Escolta/s Asignado:** ${assignedUserIds.length > 0
        ? assignedUserIds.map((id) => `<@${id}>`).join(" ")
        : "(Sin asignar)"}`));
    const confirmRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(SSU_CONFIRM_CUSTOM_ID)
        .setLabel("SSU Confirmado")
        .setStyle(discord_js_1.ButtonStyle.Success));
    container.addActionRowComponents(confirmRow);
    container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(SSU_ROLE_IDS.map((id) => `<@&${id}>`).join(" ")));
    return [container];
}
async function handleSSUEscortButton(interaction) {
    if (interaction.customId === "ssu_escort_request") {
        await interaction.showModal(buildSSUEscortModal());
        return true;
    }
    if (interaction.customId === SSU_CONFIRM_CUSTOM_ID) {
        const member = interaction.member;
        const hasSSURole = !!member && SSU_ROLE_IDS.some((rid) => member.roles.cache.has(rid));
        if (!hasSSURole) {
            await interaction.reply({
                content: "No tienes permisos para confirmar esta escolta.",
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return true;
        }
        const msgId = interaction.message.id;
        const req = escortRequests.get(msgId);
        if (!req) {
            await interaction.reply({
                content: "No se encontró la solicitud en memoria. Si el bot se reinició, vuelve a enviar la solicitud.",
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return true;
        }
        req.assigned.add(interaction.user.id);
        const assignedIds = Array.from(req.assigned.values());
        await interaction.update({
            components: buildSSUEscortRequestContainer(req.createdById, req.details, assignedIds),
            flags: discord_js_1.MessageFlags.IsComponentsV2,
            allowedMentions: { users: assignedIds, roles: SSU_ROLE_IDS },
        });
        return true;
    }
    return false;
}
async function handleSSUEscortModalSubmit(modal, targetChannelId) {
    if (modal.customId !== "ssu_escort_modal")
        return false;
    const details = {
        escortDatetime: modal.fields.getTextInputValue("escort_datetime"),
        meetingPoint: modal.fields.getTextInputValue("meeting_point"),
        destination: modal.fields.getTextInputValue("destination"),
        reason: modal.fields.getTextInputValue("reason"),
    };
    const channel = targetChannelId
        ? modal.guild?.channels.cache.get(targetChannelId)
        : modal.channel;
    if (!channel) {
        await modal.reply({
            content: "No se pudo encontrar el canal para enviar la solicitud.",
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return true;
    }
    const sent = (await channel.send({
        components: buildSSUEscortRequestContainer(modal.user.id, details, []),
        flags: discord_js_1.MessageFlags.IsComponentsV2,
        allowedMentions: { roles: SSU_ROLE_IDS },
    }));
    escortRequests.set(sent.id, {
        createdById: modal.user.id,
        details,
        assigned: new Set(),
    });
    await modal.reply({
        content: "✅ Su solicitud de escolta ha sido enviada correctamente.",
        flags: discord_js_1.MessageFlags.Ephemeral,
    });
    return true;
}
async function sendSSUEscortPanel(interaction) {
    await interaction.reply({
        components: buildSSUEscortPanelComponents(),
        flags: discord_js_1.MessageFlags.IsComponentsV2,
    });
}
exports.SSU_ROLES = SSU_ROLE_IDS;
