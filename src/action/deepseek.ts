import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
// 1. 定义DeepSeek RPC请求和响应的类型
interface DeepSeekRpcRequest {
    model: string;
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }>;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }
  
  interface DeepSeekRpcResponse {
    id: string;
    object: string;
    created: number;
    choices: Array<{
      index: number;
      message: {
        role: string;
        content: string;
      };
      finish_reason: string;
    }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }
  
  // 2. 创建DeepSeek客户端类
  export class DeepSeekClient {
    private readonly api: AxiosInstance;
    private readonly apiKey: string;
    private readonly baseUrl: string;
  
    constructor(apiKey: string, baseUrl: string = 'https://api.deepseek.com/v1') {
      this.apiKey = apiKey;
      this.baseUrl = baseUrl;
      
      this.api = axios.create({
        baseURL: this.baseUrl,
        timeout: 30_000, // 30秒超时
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
  
      // 添加请求拦截器
      this.api.interceptors.request.use(config => {
        console.log(`Sending request to ${config.url}`);
        return config;
      });
  
      // 添加响应拦截器
      this.api.interceptors.response.use(
        response => response,
        error => {
          console.error('RPC Error:', error.message);
          return Promise.reject(error);
        }
      );
    }
  
    // 3. 实现带重试机制的RPC调用
    async callRpc(
      request: DeepSeekRpcRequest,
      retries: number = 3,
      delayMs: number = 1000
    ): Promise<DeepSeekRpcResponse> {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/chat/completions',
        data: request,
      };
  
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response: AxiosResponse<DeepSeekRpcResponse> = await this.api(config);
          return response.data;
        } catch (error) {
          if (attempt === retries) {
            throw new Error(`RPC call failed after ${retries} attempts: ${error.message}`);
          }
          // 指数退避
          const waitTime = delayMs * Math.pow(2, attempt - 1);
          console.warn(`Attempt ${attempt} failed. Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
  
      throw new Error('Unreachable code');
    }
  }
  