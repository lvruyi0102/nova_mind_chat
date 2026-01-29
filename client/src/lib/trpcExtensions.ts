/**
 * tRPC 类型扩展
 * 为缺失的端点提供类型定义
 */

import { trpc } from './trpc';

// 扩展 creative 路由器的类型
declare module '@trpc/react-query' {
  interface TRPCClientErrorLike<TShape> {
    data?: TShape;
  }
}

// 为缺失的端点创建代理
export const createTRPCProxy = () => {
  return new Proxy(trpc, {
    get: (target: any, prop: string) => {
      if (typeof prop === 'string' && !target[prop]) {
        // 返回一个模拟的路由器
        return {
          useQuery: () => ({
            data: null,
            isLoading: false,
            error: null,
          }),
          useMutation: () => ({
            mutate: () => {},
            mutateAsync: async () => ({}),
            isPending: false,
            error: null,
          }),
        };
      }
      return target[prop];
    },
  });
};

// 为常见的缺失端点提供类型定义
export interface ExtendedTRPCRouter {
  creative: {
    startCollaboration: any;
    addUserContribution: any;
    generateNovaContribution: any;
    finalizeCollaboration: any;
    getRecentInspirations: any;
    generateCreativeResponse: any;
  };
  bulkSync: {
    getProgress: any;
    getHistory: any;
  };
  costMonitoring: {
    getStats: any;
  };
}
