/**
 * 类型修复工具函数
 * 用于处理可能不存在的属性和类型转换
 */

/**
 * 安全地获取对象属性，如果不存在则返回默认值
 */
export const safeGet = <T, K extends keyof any>(
  obj: T | undefined | null,
  key: K,
  defaultValue: any = null
): any => {
  if (!obj) return defaultValue;
  return (obj as any)[key] ?? defaultValue;
};

/**
 * 安全地调用 toFixed 方法
 */
export const safeToFixed = (value: any, digits: number = 2): string => {
  if (typeof value === 'number') {
    return value.toFixed(digits);
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(digits);
  }
  return '0.00';
};

/**
 * 安全地获取数组长度
 */
export const safeLength = (arr: any): number => {
  if (Array.isArray(arr)) return arr.length;
  return 0;
};

/**
 * 类型守卫：检查对象是否有特定属性
 */
export const hasProperty = <T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, any> => {
  return key in obj;
};

/**
 * 安全地访问嵌套属性
 */
export const safeGetNested = (obj: any, path: string, defaultValue: any = null): any => {
  try {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current == null) return defaultValue;
      current = current[key];
    }
    return current ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * 类型断言辅助函数
 */
export const assertType = <T>(value: any, typeName: string): T => {
  if (value === null || value === undefined) {
    console.warn(`Expected ${typeName}, got ${typeof value}`);
  }
  return value as T;
};
