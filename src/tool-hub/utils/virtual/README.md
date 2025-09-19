# DAG 可视化工具

这个模块提供了工具依赖关系图 (DAG) 的可视化功能，可以生成 Mermaid 格式的图表来展示工具之间的依赖关系。

## 功能特性

- 🎨 **完整 DAG 图**：生成包含所有工具依赖关系的完整图表
- 🔍 **工具链路图**：生成特定工具的依赖路径图
- 🎯 **灵活配置**：支持自定义节点样式、边样式和图表方向
- 📝 **Markdown 输出**：生成包含图表的完整 Markdown 文档
- 🔍 **依赖分析**：自动分析工具依赖关系和节点类型

## 快速开始

```typescript
import { ToolHub } from '../core/tool-hub';
import { DAGVisualizer } from '../virtual/dag-visualizer';

// 创建工具中心
const toolHub = new ToolHub();

// 注册工具
await toolHub.registerBatch(tools);

// 创建可视化器
const visualizer = new DAGVisualizer(toolHub);

// 生成 Mermaid 图表
const mermaid = visualizer.generateMermaidDAG();
console.log(mermaid);

// 生成 Markdown 文档
const markdown = visualizer.generateMarkdownDAG();
```

## API 参考

### DAGVisualizer

#### 构造函数

```typescript
constructor(toolHub: ToolHub, config?: DAGVisualizationConfig)
```

#### 主要方法

##### `generateMermaidDAG(): string`
生成完整的 Mermaid 格式 DAG 图。

##### `generateMarkdownDAG(): string`
生成包含图表的 Markdown 文档。

##### `generateToolDependencyPath(toolName: string): string`
生成特定工具的依赖路径图。

### 配置选项

```typescript
interface DAGVisualizationConfig {
  direction?: 'TD' | 'TB' | 'BT' | 'RL' | 'LR';  // 图表方向
  nodeStyle?: {
    root?: string;        // 根节点样式
    normal?: string;      // 普通节点样式
    leaf?: string;        // 叶子节点样式
  };
  edgeStyle?: {
    required?: string;    // 必需依赖样式
    optional?: string;    // 可选依赖样式
    alternative?: string; // 替代依赖样式
  };
}
```

## 使用示例

### 1. 基本使用

```typescript
const visualizer = new DAGVisualizer(toolHub);
const mermaid = visualizer.generateMermaidDAG();
```

### 2. 自定义配置

```typescript
const visualizer = new DAGVisualizer(toolHub, {
  direction: 'LR',  // 从左到右
  nodeStyle: {
    root: 'fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px',
    normal: 'fill:#f3e5f5,stroke:#4a148c,stroke-width:2px',
    leaf: 'fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px'
  }
});
```

### 3. 生成特定工具路径

```typescript
const path = visualizer.generateToolDependencyPath('order');
console.log(path);
```

### 4. 保存到文件

```typescript
import { writeFileSync } from 'fs';

const markdown = visualizer.generateMarkdownDAG();
writeFileSync('dag-diagram.md', markdown, 'utf8');
```

## 图表说明

### 节点类型

- 🔵 **根节点**：无依赖的工具（蓝色边框）
- 🟣 **普通节点**：有依赖的工具（紫色边框）
- 🟢 **叶子节点**：不被其他工具依赖的工具（绿色边框）

### 依赖组类型

- **[任意]**：任意依赖 (any) - 满足任意一个即可
- **[全部]**：全部依赖 (all) - 必须全部满足
- **[序列]**：序列依赖 (sequence) - 按顺序执行

### 依赖强度类型

- **required**：必需依赖
- **optional**：可选依赖
- **alternative**：替代依赖

## 支持的图表方向

- `TD`：从上到下（默认）
- `TB`：从上到下
- `BT`：从下到上
- `RL`：从右到左
- `LR`：从左到右

## 输出格式

### Mermaid 图表

```mermaid
graph TD
    A["Tool A"]
    B["Tool B"]
    A --> B|"依赖关系"|
    classDef rootStyle fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    classDef normalStyle fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    class A rootStyle
    class B normalStyle
```

### Markdown 文档

包含：
- 图表说明
- 依赖关系类型说明
- Mermaid 图表代码
- 生成时间

## 测试

运行测试来验证功能：

```bash
npx tsx src/tool-hub/examples/test-dag-visualization.mts
```

这将生成示例图表并保存到 `src/tool-hub/virtual/` 目录。

## 注意事项

1. 确保工具已正确注册到 ToolHub
2. 图表生成基于当前的工具状态
3. 大型依赖图可能需要调整图表方向以获得更好的可读性
4. Mermaid 图表需要在支持 Mermaid 的环境中查看（如 GitHub、GitLab、VS Code 等）
