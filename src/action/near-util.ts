
import { Near, Account, KeyPair, connect, WalletConnection } from 'near-api-js';

import { ConnectConfig, Contract } from 'near-api-js';
import { BrowserLocalStorageKeyStore, InMemoryKeyStore } from 'near-api-js/lib/key_stores';
import { Logger } from 'near-api-js/lib/utils';
export class NearContract {
  private contract: Contract;
  private account: Account;
   constructor(account: Account, contractId: string, viewMethods: string[], changeMethods: string[],useLocalViewExecution: boolean) {
    this.account = account;
    this.contract = new Contract(account, contractId, {
      viewMethods,
      changeMethods,
      useLocalViewExecution
    });
  }

  // 初始化合约实例
  static async init(
    contractId: string,
    accountId: string,
    network: NearNetwork = 'testnet',
    viewMethods: string[] = [],
    changeMethods: string[] = []
  ): Promise<NearContract> {
    const account = await NearUtils.getAccount(accountId, network);
    return new NearContract(account, contractId, viewMethods, changeMethods,false );
  }

  // 调用视图方法（不修改状态）
  async view<T = any>(
    method: string,
    args: object = {}
  ): Promise<ViewResponse<T>> {
    try {
      const result = await (this.contract as any)[method](args);
      return { ok: true, data: result };
    } catch (error: any) {
      return { 
        ok: false, 
        error: error.message,
        data: null as any 
      };
    }
  }

  // 调用变更方法（修改状态）
  async call(
    method: string,
    args: object = {},
    options: ContractCallOptions = {}
  ): Promise<ViewResponse<string>> {
    try {
      const result = await (this.contract as any)[method](args, options);
      return { ok: true, data: result.transaction.hash };
    } catch (error: any) {
      return { 
        ok: false, 
        error: error.message,
        data: '' 
      };
    }
  }


}
// NEAR 网络配置类型
export type NearNetwork = 'testnet' | 'mainnet' | 'betanet' | 'localnet';

// 合约方法调用选项
export interface ContractCallOptions {
  gas?: string;    // 例如 "300000000000000"
  deposit?: string; // 例如 "1000000000000000000000000" (1 NEAR)
  walletMeta?: string;
  walletCallbackUrl?: string;
}

// 合约视图方法响应
export interface ViewResponse<T = any> {
  ok: boolean;
  data: T;
  error?: string;
}

export class NearUtils {
  private static instances: Map<string, Near> = new Map();

  // 初始化NEAR连接
  static async initConnection(
    network: NearNetwork = 'testnet',
    keyPair?: KeyPair
  ): Promise<Near> {
    const cacheKey = `${network}-${keyPair?.getPublicKey().toString() || 'wallet'}`;
    
    if (!this.instances.has(cacheKey)) {
        const config = {
               networkId: 'testnet',
               nodeUrl: 'https://rpc.testnet.near.org',
               walletUrl: 'https://wallet.testnet.near.org',
               helperUrl: 'https://helper.testnet.near.org',
               keyStore: new InMemoryKeyStore(),
               deps: { keyStore: new BrowserLocalStorageKeyStore() },
               logger: Logger,
               keyPath: '/path/to/account-key.json',
               masterAccount: 'master-account.near',
            };
      this.instances.set(cacheKey, await connect(config));
    }

    return this.instances.get(cacheKey)!;
  }

  // 获取账户
  static async getAccount(
    accountId: string,
    network: NearNetwork = 'testnet'
  ): Promise<Account> {
    const near = await this.initConnection(network);
    return await near.account(accountId);
  }

  // 初始化钱包连接
  static async initWallet(
    contractId: string,
    network: NearNetwork = 'testnet'
  ): Promise<WalletConnection> {
    const near = await this.initConnection(network);
    return new WalletConnection(near, contractId);
  }
}

// 定义聊天合约接口
export interface IChatContract {
  send_message(message: string): Promise<ViewResponse<string>>;
  get_messages(account_id: string): Promise<ViewResponse<string[]>>;
  get_last_message(): Promise<ViewResponse<string>>;
}

export class ChatContract extends NearContract implements IChatContract {
  static async init(
    contractId: string,
    accountId: string,
    network: 'testnet' | 'mainnet' = 'testnet'
  ): Promise<ChatContract> {
    const contract = await super.init(
      contractId,
      accountId,
      network,
      ['get_messages', 'get_last_message'], // 视图方法
      ['send_message']                      // 变更方法
    );
    return contract as ChatContract;
  }

  async send_message(message: string): Promise<ViewResponse<string>> {
    return this.call('send_message', { message }, {
      gas: '30000000000000',
      deposit: '10000000000000000000000' // 0.01 NEAR
    });
  }

  async get_messages(account_id: string): Promise<ViewResponse<string[]>> {
    return this.view('get_messages', { account_id });
  }

  async get_last_message(): Promise<ViewResponse<string>> {
    return this.view('get_last_message', {});
  }
}
// 示例1：使用钱包连接（浏览器环境）
async function walletDemo() {
  const contractId = 'chx.testnet';
  const chat = await ChatContract.init(contractId, '', 'testnet');
  
  // 钱包登录
  const wallet = await NearUtils.initWallet(contractId);
  if (!wallet.isSignedIn()) {
    wallet.requestSignIn({contractId: contractId,keyType: 'ed25519'});
    return;
  }

  // 发送消息
  const sendResult = await chat.send_message('Hello NEAR!');
  console.log('Transaction Hash:', sendResult.data);

  // 查询消息
  const messages = await chat.get_messages(wallet.getAccountId());
  console.log('Messages:', messages.data);
}

// 示例2：使用密钥对（Node.js环境）
async function keyPairDemo() {
  const contractId = 'chat.yourname.testnet';
  const accountId = 'youraccount.testnet';
  const privateKey = 'ed25519:your_private_key_here';
  
  const keyPair = KeyPair.fromString(privateKey);
  const chat = await ChatContract.init(
    contractId, 
    accountId, 
    'testnet'
  );

  // 发送消息
  const sendResult = await chat.send_message('Hello from Node.js!');
  console.log('Transaction Hash:', sendResult.data);

  // 查询最后消息
  const lastMsg = await chat.get_last_message();
  console.log('Last Message:', lastMsg.data);
}
