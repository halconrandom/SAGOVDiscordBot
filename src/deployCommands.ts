import "dotenv/config";
import { REST, Routes } from "discord.js";
import { slashCommandData } from "./commands";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} no está definido en el entorno.`);
  }
  return value;
}

const token = requireEnv("DISCORD_TOKEN");
const clientId = requireEnv("DISCORD_CLIENT_ID");
const guildId = process.env.DISCORD_GUILD_ID;

const rest = new REST({ version: "10" }).setToken(token);

async function main() {
  try {
    if (guildId) {
      console.log(
        `Registrando ${slashCommandData.length} comandos en la guild ${guildId}...`
      );
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: slashCommandData,
      });
    } else {
      console.log(
        `Registrando ${slashCommandData.length} comandos globales (esto puede tardar hasta 1 hora en propagarse)...`
      );
      await rest.put(Routes.applicationCommands(clientId), {
        body: slashCommandData,
      });
    }
    console.log("Comandos registrados correctamente.");
  } catch (err) {
    console.error("Error desplegando los comandos:", err);
    process.exitCode = 1;
  }
}

main();
