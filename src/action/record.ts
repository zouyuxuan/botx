import { Action, elizaLogger, IAgentRuntime, Memory, State } from '@elizaos/core';
import {DeepSeekClient} from './deepseek';

// Example send request to  deepseek
export const recordChatAction: Action = {
  name: 'RECORD_CHAT',
  similes: ['RECORD', 'CHAT', 'SAVE'],
  description: "Record every chat message",
  suppressInitialMessage: true, // Suppress initial response since we'll generate our own

  // Validate if this action should be used
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    // Check if message contains image generation triggers
    return (
      text.includes('record') ||
      text.includes('chat') ||
      text.includes('save') 
    );
  },

  // Handle the action execution
  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
        // 将消息传递给大模型，大模型返回内容，根据大模型内容大小，超过10kb大小的内容存储到0g，
        // 将0g返回的hash 存储到near合约中，
        // 将消息和返回结果near合约保存chat massage
        let deepseek_client = new DeepSeekClient(runtime.token)
        const rpcResponse = await deepseek_client.callRpc({
            model: 'deepseek-chat',
            messages: [
            { role: 'user', content: message.content.text }
            ],
            temperature: 0.5,
      });
      elizaLogger.info("rpcResponse",rpcResponse);
      return true;
    } catch (error) {
      console.error('Image generation failed:', error);
      return false;
    }
  },

  // Example usage patterns
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Can you generate an image of a sunset?',
        },
      },
      {
        user: '{{user2}}',
        content: {
          text: "This is a chat box",
          action: 'RECORD_CHAT',
        },
      },
    ],
  ],
};
