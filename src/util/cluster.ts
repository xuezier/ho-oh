import * as fakerCluster from 'cluster';

// 这行代码将 'cluster' 模块导入并赋值给名为 'fakerCluster' 的变量。
// 注意模块名称是带有单引号的字符串。'*' 表示该模块的所有导出都要被绑定到指定名称的变量上。

// 下面这行代码使用了 TypeScript 中的类型断言(as) 将类型为 'unknown' 的 'fakerCluster' 变量转换为 'cluster.Cluster' 类型。
export const cluster = fakerCluster as unknown as fakerCluster.Cluster;

// 至此，我们将 'cluster' 模块中的所有导出都直接通过 'cluster' 变量进行访问，
// 同时又避免了 TypeScript 编译器报错 "Property X does not exists on type 'typeof Cluster'" 的问题。
