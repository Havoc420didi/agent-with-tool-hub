// dag-visualizer.ts - DAG 关系图可视化工具

import { ToolHub } from '../../core/tool-hub';
import { ToolConfig } from '../../types/tool.types';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * DAG 可视化配置
 */
export interface DAGVisualizationConfig {
  /** 图表方向 */
  direction?: 'TD' | 'TB' | 'BT' | 'RL' | 'LR';
  /** 节点样式 */
  nodeStyle?: {
    /** 根节点样式 */
    root?: string;
    /** 普通节点样式 */
    normal?: string;
    /** 叶子节点样式 */
    leaf?: string;
  };
  /** 边样式 */
  edgeStyle?: {
    /** 必需依赖样式 */
    required?: string;
    /** 可选依赖样式 */
    optional?: string;
    /** 替代依赖样式 */
    alternative?: string;
  };
}

/**
 * 节点信息
 */
interface NodeInfo {
  name: string;
  type: 'root' | 'normal' | 'leaf';
  dependencies: string[];
  dependents: string[];
}

/**
 * 边信息
 */
interface EdgeInfo {
  from: string;
  to: string;
  type: 'required' | 'optional' | 'alternative';
  groupType?: 'any' | 'all' | 'sequence';
  description?: string;
}

/**
 * DAG 可视化器
 */
export class DAGVisualizer {
  private toolHub: ToolHub;
  private config: DAGVisualizationConfig;

  constructor(toolHub: ToolHub, config: DAGVisualizationConfig = {}) {
    this.toolHub = toolHub;
    this.config = {
      direction: 'TD',
      nodeStyle: {
        root: 'fill:#e1f5fe,stroke:#01579b,stroke-width:3px',
        normal: 'fill:#f3e5f5,stroke:#4a148c,stroke-width:2px',
        leaf: 'fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px'
      },
      edgeStyle: {
        required: 'stroke:#1976d2,stroke-width:2px',
        optional: 'stroke:#f57c00,stroke-width:1px,stroke-dasharray: 3 3',
        alternative: 'stroke:#7b1fa2,stroke-width:1px,stroke-dasharray: 5 5'
      },
      ...config
    };
  }

  /**
   * 生成 Mermaid 格式的 DAG 图
   */
  generateMermaidDAG(): string {
    const tools = this.toolHub.getAll();
    const { nodes, edges } = this.analyzeDependencies(tools);
    
    let mermaid = `graph ${this.config.direction}\n`;
    
    // 添加节点定义
    mermaid += this.generateNodeDefinitions(nodes);
    
    // 添加边定义
    mermaid += this.generateEdgeDefinitions(edges);
    
    // 添加样式定义
    mermaid += this.generateStyleDefinitions(nodes);
    
    return mermaid;
  }

  /**
   * 生成 Markdown 格式的图表
   */
  generateMarkdownDAG(): string {
    const mermaid = this.generateMermaidDAG();
    
    return `# 工具依赖关系图 (DAG)

## 图表说明

此图展示了工具之间的依赖关系，包括：
- 🔵 **根节点**：无依赖的工具
- 🟣 **普通节点**：有依赖的工具
- 🟢 **叶子节点**：不被其他工具依赖的工具

## 依赖关系类型

### 依赖组类型
- **实线箭头 (→)**：序列依赖 (sequence) - 按顺序执行
- **虚线箭头 (-.->)**：任意依赖 (any) - 满足任意一个即可
- **粗实线箭头 (==>)**：全部依赖 (all) - 必须全部满足

### 依赖强度类型
- **required**：必需依赖
- **optional**：可选依赖  
- **alternative**：替代依赖

## 可视化图表

\`\`\`mermaid
${mermaid}
\`\`\`

---
*生成时间: ${new Date().toLocaleString()}*
`;
  }

  /**
   * 分析工具依赖关系
   */
  private analyzeDependencies(tools: ToolConfig[]): { nodes: NodeInfo[], edges: EdgeInfo[] } {
    const nodes: NodeInfo[] = [];
    const edges: EdgeInfo[] = [];
    
    // 创建节点信息
    for (const tool of tools) {
      const node: NodeInfo = {
        name: tool.name,
        type: 'normal',
        dependencies: [],
        dependents: []
      };
      nodes.push(node);
    }
    
    // 分析依赖关系
    for (const tool of tools) {
      if (tool.dependencyGroups) {
        for (const group of tool.dependencyGroups) {
          for (const dep of group.dependencies) {
            const edge: EdgeInfo = {
              from: dep.toolName,
              to: tool.name,
              type: dep.type,
              groupType: group.type,
              description: dep.description
            };
            edges.push(edge);
            
            // 更新节点依赖信息
            const fromNode = nodes.find(n => n.name === dep.toolName);
            const toNode = nodes.find(n => n.name === tool.name);
            
            if (fromNode && toNode) {
              fromNode.dependents.push(tool.name);
              toNode.dependencies.push(dep.toolName);
            }
          }
        }
      }
    }
    
    // 确定节点类型
    for (const node of nodes) {
      if (node.dependencies.length === 0) {
        node.type = 'root';
      } else if (node.dependents.length === 0) {
        node.type = 'leaf';
      }
    }
    
    return { nodes, edges };
  }

  /**
   * 生成节点定义
   */
  private generateNodeDefinitions(nodes: NodeInfo[]): string {
    let definitions = '';
    
    for (const node of nodes) {
      const nodeId = this.sanitizeNodeId(node.name);
      const label = this.generateNodeLabel(node);
      definitions += `    ${nodeId}["${label}"]\n`;
    }
    
    return definitions;
  }

  /**
   * 生成边定义
   */
  private generateEdgeDefinitions(edges: EdgeInfo[]): string {
    let definitions = '';
    
    for (const edge of edges) {
      const fromId = this.sanitizeNodeId(edge.from);
      const toId = this.sanitizeNodeId(edge.to);
      
      let edgeDef = `    ${fromId} --> ${toId}`;
      
      // 根据依赖组类型选择不同的边样式和标签
      let labelPrefix = '';
      if (edge.groupType === 'any') {
        labelPrefix = '[任意] ';
      } else if (edge.groupType === 'all') {
        labelPrefix = '[全部] ';
      } else if (edge.groupType === 'sequence') {
        labelPrefix = '[序列] ';
      }
      
      // 添加边标签 - 使用正确的 Mermaid 语法
      if (edge.description) {
        // 清理描述文本，移除特殊字符
        const cleanDescription = edge.description.replace(/[|"']/g, '').trim();
        if (cleanDescription) {
          // 使用正确的 Mermaid 边标签语法
          edgeDef = `    ${fromId} -->|"${labelPrefix}${cleanDescription}"| ${toId}`;
        } else {
          edgeDef = `    ${fromId} --> ${toId}`;
        }
      } else {
        edgeDef = `    ${fromId} --> ${toId}`;
      }
      
      definitions += edgeDef + '\n';
    }
    
    return definitions;
  }

  /**
   * 生成样式定义
   */
  private generateStyleDefinitions(nodes: NodeInfo[]): string {
    let styles = '';
    
    for (const node of nodes) {
      const nodeId = this.sanitizeNodeId(node.name);
      let style = '';
      
      if (node.type === 'root') {
        style = this.config.nodeStyle?.root || '';
      } else if (node.type === 'leaf') {
        style = this.config.nodeStyle?.leaf || '';
      } else {
        style = this.config.nodeStyle?.normal || '';
      }
      
      if (style) {
        styles += `    classDef ${nodeId}Style ${style}\n`;
        styles += `    class ${nodeId} ${nodeId}Style\n`;
      }
    }
    
    return styles;
  }

  /**
   * 生成节点标签
   */
  private generateNodeLabel(node: NodeInfo): string {
    return node.name;
  }


  /**
   * 清理节点 ID（移除特殊字符）
   */
  private sanitizeNodeId(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }


  /**
   * 生成特定工具的依赖路径图
   */
  generateToolDependencyPath(toolName: string): string {
    const { nodes, edges } = this.buildDependencyChain(toolName);
    
    if (nodes.length === 0) {
      return `graph ${this.config.direction}\n    ${this.sanitizeNodeId(toolName)}["${toolName}"]`;
    }
    
    let mermaid = `graph ${this.config.direction}\n`;
    
    // 添加所有节点
    for (const node of nodes) {
      const nodeId = this.sanitizeNodeId(node);
      mermaid += `    ${nodeId}["${node}"]\n`;
    }
    
    // 添加所有边
    for (const edge of edges) {
      const fromId = this.sanitizeNodeId(edge.from);
      const toId = this.sanitizeNodeId(edge.to);
      
      let edgeDef = `    ${fromId} --> ${toId}`;
      
      // 根据依赖组类型选择不同的边样式和标签
      let labelPrefix = '';
      if (edge.groupType === 'any') {
        labelPrefix = '[任意] ';
      } else if (edge.groupType === 'all') {
        labelPrefix = '[全部] ';
      } else if (edge.groupType === 'sequence') {
        labelPrefix = '[序列] ';
      }
      
      if (edge.description) {
        const cleanDescription = edge.description.replace(/[|"']/g, '').trim();
        if (cleanDescription) {
          edgeDef = `    ${fromId} -->|"${labelPrefix}${cleanDescription}"| ${toId}`;
        } else {
          edgeDef = `    ${fromId} --> ${toId}`;
        }
      } else {
        edgeDef = `    ${fromId} --> ${toId}`;
      }
      
      mermaid += edgeDef + '\n';
    }
    
    // 添加样式
    mermaid += this.generateStyleDefinitionsForPath(nodes);
    
    return mermaid;
  }

  /**
   * 构建从目标工具到所有根节点的完整依赖链
   */
  private buildDependencyChain(targetTool: string): { nodes: string[], edges: EdgeInfo[] } {
    const tools = this.toolHub.getAll();
    const toolMap = new Map(tools.map(tool => [tool.name, tool]));
    const visited = new Set<string>();
    const nodes = new Set<string>();
    const edges: EdgeInfo[] = [];
    
    // 递归收集依赖
    const collectDependencies = (toolName: string) => {
      if (visited.has(toolName)) return;
      visited.add(toolName);
      nodes.add(toolName);
      
      const tool = toolMap.get(toolName);
      if (!tool || !tool.dependencyGroups) return;
      
      // 遍历所有依赖组
      for (const group of tool.dependencyGroups) {
        for (const dep of group.dependencies) {
          // 收集依赖工具
          collectDependencies(dep.toolName);
          
          // 添加边
          edges.push({
            from: dep.toolName,
            to: toolName,
            type: dep.type,
            groupType: group.type,
            description: dep.description
          });
        }
      }
    };
    
    // 从目标工具开始收集
    collectDependencies(targetTool);
    
    return {
      nodes: Array.from(nodes),
      edges
    };
  }

  /**
   * 为路径图生成样式定义
   */
  private generateStyleDefinitionsForPath(nodes: string[]): string {
    const tools = this.toolHub.getAll();
    const toolMap = new Map(tools.map(tool => [tool.name, tool]));
    let styles = '';
    
    for (const nodeName of nodes) {
      const tool = toolMap.get(nodeName);
      if (!tool) continue;
      
      const nodeId = this.sanitizeNodeId(nodeName);
      let style = '';
      
      // 判断节点类型
      const hasDependencies = tool.dependencyGroups && tool.dependencyGroups.length > 0;
      const isReferenced = tools.some(t => 
        t.dependencyGroups?.some(group => 
          group.dependencies.some(dep => dep.toolName === nodeName)
        )
      );
      
      if (!hasDependencies) {
        style = this.config.nodeStyle?.root || '';
      } else if (!isReferenced) {
        style = this.config.nodeStyle?.leaf || '';
      } else {
        style = this.config.nodeStyle?.normal || '';
      }
      
      if (style) {
        styles += `    classDef ${nodeId}Style ${style}\n`;
        styles += `    class ${nodeId} ${nodeId}Style\n`;
      }
    }
    
    return styles;
  }

  /**
   * 保存 Markdown 图表到文件
   */
  saveMarkdownToFile(filename: string = 'dag-diagram.md', outputDir: string = 'data'): string {
    const markdown = this.generateMarkdownDAG();
    const outputPath = join(process.cwd(), outputDir, filename);
    
    // 确保目录存在
    mkdirSync(dirname(outputPath), { recursive: true });
    
    writeFileSync(outputPath, markdown, 'utf8');
    return outputPath;
  }

  /**
   * 保存 Mermaid 图表到文件
   */
  saveMermaidToFile(filename: string = 'dag-diagram.mmd', outputDir: string = 'data'): string {
    const mermaid = this.generateMermaidDAG();
    const outputPath = join(process.cwd(), outputDir, filename);
    
    // 确保目录存在
    mkdirSync(dirname(outputPath), { recursive: true });
    
    writeFileSync(outputPath, mermaid, 'utf8');
    return outputPath;
  }


  /**
   * 保存工具依赖路径到文件
   */
  saveToolPathToFile(toolName: string, filename?: string, outputDir: string = 'data'): string {
    const mermaid = this.generateToolDependencyPath(toolName);
    const outputFilename = filename || `tool-path-${toolName}.mmd`;
    const outputPath = join(process.cwd(), outputDir, outputFilename);
    
    // 确保目录存在
    mkdirSync(dirname(outputPath), { recursive: true });
    
    writeFileSync(outputPath, mermaid, 'utf8');
    return outputPath;
  }
}
