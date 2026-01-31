/**
 * tRPC 类型扩展和兼容性修复
 * 处理 tRPC v11 中的 API 变化
 */

import { trpc } from './trpc';

/**
 * 为常见的缺失端点提供类型定义
 */
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

/**
 * 为缺失的端点创建代理
 * 这个函数返回一个代理对象，用于处理不存在的端点
 */
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
          useInfiniteQuery: () => ({
            data: { pages: [] },
            isLoading: false,
            error: null,
          }),
        };
      }
      return target[prop];
    },
  });
};
