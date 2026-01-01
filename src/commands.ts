import { SlashCommandBuilder } from "discord.js";

export const slashCommandBuilders = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Pong con Components V2"),
  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Borrar mensajes recientes del canal")
    .addIntegerOption((opt) =>
      opt
        .setName("count")
        .setDescription("Cantidad a borrar (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),
  new SlashCommandBuilder()
    .setName("paneltickets")
    .setDescription("Enviar panel de tickets en el canal actual"),
  new SlashCommandBuilder()
    .setName("openticket")
    .setDescription("Abrir un ticket manualmente"),
  new SlashCommandBuilder()
    .setName("panelssu")
    .setDescription("Enviar panel de solicitud de escolta SSU"),
  new SlashCommandBuilder()
    .setName("addmember")
    .setDescription("Añadir un miembro al canal actual")
    .addUserOption((opt) =>
      opt
        .setName("member")
        .setDescription("Miembro que obtendrá acceso al canal")
        .setRequired(true)
    ),
];

export const slashCommandData = slashCommandBuilders.map((builder) =>
  builder.setDMPermission(false).toJSON()
);
