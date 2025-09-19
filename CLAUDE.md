# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a LangGraph Agent framework built with Koa.js + TypeScript + Rspack. It provides a lightweight, type-safe framework for building AI agents with dynamic tool management, streaming responses, and memory support.

## Development Commands

```bash
# Development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Build with Rspack for production
npm run build:rspack

# Start development server (tsx)
npm run start

# Start production server
npm run start:dist

# Run chat tests
npm run chat
npm run test:quick
```

## Architecture

### Core Components
- **AgentBuilder** (`src/core/agent-builder.ts`): Main agent construction and management
- **ToolHub** (`src/tool-hub/`): Central tool registry and execution system
- **Koa Server** (`src/main.ts`): HTTP API server with REST endpoints
- **Memory Manager**: Supports both LangGraph built-in memory and API-based memory

### Key Features
- Dynamic tool registration/removal at runtime
- Multiple tool execution modes (internal/external)
- Streaming responses with sentence-level chunking
- Memory management with thread-based conversations
- RESTful API for agent management and chat

### Project Structure
```
src/
├── main.ts              # Koa.js application entry
├── index.ts             # Framework main exports
├── core/                # Core agent functionality
│   ├── agent-builder.ts
│   ├── types.ts
│   ├── memory-manager.ts
│   └── tool-execution-strategy.ts
├── tool-hub/            # Central tool management
│   ├── core/           # Tool registry and hub
│   ├── adapters/       # Tool definition and execution adapters
│   ├── presets/        # Built-in tool presets
│   └── utils/          # Utility functions
├── services/           # Business logic services
│   └── agent.service.ts
├── routes/             # HTTP route handlers
│   ├── index.ts
│   ├── chat.routes.ts
│   ├── tool.routes.ts
│   └── health.routes.ts
└── middleware/         # Koa middleware
    └── error.middleware.ts
```

### Tool System Architecture

The ToolHub provides a unified interface for tool management:
- **Tool Registry**: Central registration and discovery
- **Adapters**: Convert between different tool formats (LangChain, custom)
- **Execution Strategies**: Internal (direct) vs external (async) execution
- **Preset Tools**: Built-in system tools and utilities

### Memory Management
- **LG Mode**: Uses LangGraph's built-in MemorySaver with thread-based persistence
- **API Mode**: Manual history management through API calls
- **Hybrid**: Can switch between modes dynamically

### API Endpoints
- `GET /` - API info
- `GET /api/health` - Health check
- `POST /api/agents` - Create agent
- `POST /api/agents/:id/chat` - Chat with agent
- `POST /api/agents/:id/chat/stream` - Stream chat
- `POST /api/agents/:id/tools` - Add tools
- `GET /api/agents/:id/tools` - List tools
- `DELETE /api/agents/:id` - Delete agent

### Environment Configuration
Create `config.env` with:
```env
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.deepseek.com
PORT=3000
HOST=127.0.0.1
NODE_ENV=development
VERBOSE_LOGS=true
```

### TypeScript Configuration
- Target: ES2022
- Module: ESNext
- Strict mode enabled
- Path aliases: `@/*` -> `./src/*`
- Output directory: `./dist`

### Testing
Test files use `.mts` extension and can be run with:
- `npm run chat` - Full chat test
- `npm run test:quick` - Quick test

Tests are located in `tests/` directory and use the main framework exports.