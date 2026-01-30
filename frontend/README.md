# Frontend - React 项目

这是一个使用 React + TypeScript + Vite 构建的标准前端项目。

## 技术栈

- **React** 18.2.0 - UI 框架
- **TypeScript** 5.2.2 - 类型系统
- **Vite** 5.0.8 - 构建工具
- **ESLint** - 代码规范检查

## 项目结构

```
frontend/
├── public/              # 静态资源目录
│   └── vite.svg
├── src/                 # 源代码目录
│   ├── App.tsx         # 主应用组件
│   ├── App.css         # 应用样式
│   ├── main.tsx        # React 入口文件
│   ├── index.css       # 全局样式
│   └── vite-env.d.ts   # Vite 类型定义
├── index.html          # HTML 入口文件
├── package.json        # 项目配置和依赖
├── tsconfig.json       # TypeScript 配置
├── tsconfig.node.json  # Node 环境 TypeScript 配置
├── vite.config.ts      # Vite 构建工具配置
├── .eslintrc.cjs       # ESLint 代码规范配置
└── .gitignore          # Git 忽略文件
```

## 开始使用

### 安装依赖

```bash
npm install
```

### 开发模式

启动开发服务器（默认端口：3000）

```bash
npm start
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 预览生产构建

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

## 开发说明

- 所有组件和工具函数应放在 `src/` 目录下
- 静态资源（图片、字体等）放在 `public/` 目录
- 遵循 TypeScript 严格模式
- 遵循 ESLint 代码规范
- 组件设计遵循单一职责原则

## 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0

