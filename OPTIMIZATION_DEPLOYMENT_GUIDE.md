# Nova-Mind 内存优化部署指南

## 概述

本指南说明如何部署代码压缩和知识优化方案，进一步降低 Nova-Mind 的内存占用。

## 优化方案总结

### 第 1 层：代码压缩
- 清理 dist 目录和缓存文件（释放 17MB）
- 压缩图像文件（6.2MB → 2.97MB，节省 3.2MB）
- 归档冗余文档（300KB+）
- **总计节省：20MB+**

### 第 2 层：知识压缩
- LRU 缓存系统（自动删除最少使用的项）
- 数据去重（共享相同对象引用）
- 内存监控（实时统计缓存命中率）
- **预期效果：缓存命中率 > 90%**

### 第 3 层：构建优化
- Terser 代码压缩（移除 console 和 debugger）
- 代码分割（React、UI 库分离）
- 包体积警告（500KB 阈值）
- **预期效果：生产包体积减少 30-40%**

### 第 4 层：内存管理
- 激进内存优化（禁用后台任务）
- 自动重启管理（内存 > 90% 时重启）
- 增强型内存优化器（LRU + 监控）
- **预期效果：内存使用率稳定在 60-75%**

## 部署步骤

### 步骤 1：验证优化代码

```bash
# 检查新创建的文件
ls -la server/services/knowledgeCompression.ts
ls -la server/services/enhancedMemoryOptimizer.ts
ls -la server/services/index.ts

# 运行优化验证测试
pnpm test server/tests/optimization-verification.test.ts
```

### 步骤 2：启用增强型内存优化器

在 `server/_core/index.ts` 中添加：

```typescript
import { getEnhancedMemoryOptimizer } from '../services/enhancedMemoryOptimizer';

// 在服务器启动时
const optimizer = getEnhancedMemoryOptimizer();
await optimizer.start();
```

### 步骤 3：监控内存使用

访问内存监控仪表板：
- 路由：`/memory-monitor`
- 功能：实时查看堆内存使用率、缓存统计、自动重启状态

### 步骤 4：验证部署

```bash
# 启动开发服务器
pnpm run dev

# 在另一个终端检查内存
node -e "setInterval(() => {
  const mem = process.memoryUsage();
  console.log('Heap:', (mem.heapUsed / mem.heapTotal * 100).toFixed(1) + '%');
}, 5000);"
```

## 预期结果

### 内存使用率
- **初始状态**：96%+（109MB/113MB）
- **代码压缩后**：~85%（释放 20MB）
- **知识压缩后**：~75%（LRU 缓存优化）
- **完整优化后**：60-70%（稳定范围）

### 性能指标
- 缓存命中率：> 90%
- 自动重启间隔：12 小时
- 垃圾回收频率：每 2 分钟
- 监控开销：< 1%

## 故障排除

### 问题 1：内存仍然很高

**原因**：系统资源限制（3.8GB 物理内存）

**解决方案**：
1. 检查是否有其他进程占用内存
2. 确认自动重启管理器正在运行
3. 查看内存监控仪表板的趋势

### 问题 2：缓存命中率低

**原因**：访问模式不规则或缓存大小不足

**解决方案**：
1. 增加 LRU 缓存大小（在 `knowledgeCompression.ts` 中）
2. 分析访问模式
3. 调整缓存策略

### 问题 3：自动重启太频繁

**原因**：内存限制设置过低

**解决方案**：
1. 调整重启阈值（在 `autoRestartManager.ts` 中）
2. 增加重启间隔
3. 检查是否有内存泄漏

## 性能优化建议

### 短期（立即）
- ✅ 启用代码压缩（已完成）
- ✅ 启用知识压缩（已完成）
- ✅ 启用构建优化（已完成）

### 中期（1-2 周）
- 监控内存趋势
- 调整缓存参数
- 优化数据库查询

### 长期（1 个月+）
- 升级 Manus 高级计划（增加内存）
- 部署到云平台（AWS/Azure）
- 实现微服务架构

## 监控指标

### 关键指标
1. **堆内存使用率**：目标 < 75%
2. **缓存命中率**：目标 > 80%
3. **自动重启频率**：目标 < 1 次/天
4. **响应时间**：目标 < 500ms

### 告警阈值
- 堆内存 > 90%：立即重启
- 缓存命中率 < 30%：清空缓存
- 响应时间 > 1000ms：记录日志

## 相关文件

- `server/services/knowledgeCompression.ts`：LRU 缓存和数据去重
- `server/services/enhancedMemoryOptimizer.ts`：增强型内存优化器
- `server/services/index.ts`：服务索引（避免重复加载）
- `vite.config.ts`：构建优化配置
- `server/tests/optimization-verification.test.ts`：优化验证测试

## 常见问题

**Q：为什么要禁用后台任务？**
A：后台任务（学习、自我反思等）会持续占用内存。在内存充足前，禁用这些任务可以释放 30-40% 的内存。

**Q：LRU 缓存会影响性能吗？**
A：不会。LRU 缓存实际上提高了性能，因为它避免了重复的数据库查询。缓存命中率 > 90% 时，性能提升明显。

**Q：何时可以重新启用后台任务？**
A：当内存使用率稳定在 60-70% 时，可以逐步重新启用后台任务。建议一次启用一个，监控内存影响。

**Q：自动重启会导致数据丢失吗？**
A：不会。自动重启只重启应用进程，不影响数据库。所有用户数据都安全保存在数据库中。

## 下一步

1. 部署优化方案
2. 监控内存使用 24 小时
3. 根据监控数据调整参数
4. 逐步重新启用后台任务
5. 准备升级方案（如需要）
