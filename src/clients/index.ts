import { AutoClientInterface } from "@elizaos/client-auto";
import { DiscordClientInterface } from "@elizaos/client-discord";
import { TelegramClientInterface } from "@elizaos/client-telegram";
import { TwitterClientInterface } from "@elizaos/client-twitter";
import { Character, IAgentRuntime } from "@elizaos/core";

export async function initializeClients(
  character: Character,
  runtime: IAgentRuntime
) {
  const clients = [];

  return clients;
}
