# SchemaCanvas

<div align="center">

![SchemaCanvas Logo](#)

**A modern, visual database schema designer built for developers**

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

## Overview

SchemaCanvas is an intuitive, visual database schema designer that allows developers to create, edit, and export database schemas through an interactive drag-and-drop interface. Built with modern web technologies, it supports multiple database frameworks and export formats, making it the perfect tool for planning and documenting database structures.

### Key Benefits

- **Visual Design**: Intuitive drag-and-drop canvas for creating database schemas
- **Multi-Format Support**: Export to SQL, Prisma, Django, Laravel, TypeORM, and more
- **Real-time Editing**: Instant visual feedback with inline editing capabilities
- **Framework Agnostic**: Works with any modern database or ORM
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Mode**: Full dark/light theme support

## Features

### Core Schema Design
- **Interactive Canvas**: Built with React Flow for smooth, performant visual editing
- **Table Management**: Create, edit, position, and organize database tables
- **Column Management**: Add, edit, and configure columns with 17+ data types
- **Relationship Builder**: Visual foreign key relationship creation with drag-and-drop
- **Multiple Relationship Types**: One-to-one, one-to-many, many-to-many support
- **Context Menus**: Right-click interactions for quick access to common actions
- **Keyboard Shortcuts**: Ctrl+T (add table), Ctrl+E (export), Delete key support

### Import/Export Capabilities
- **Export Formats**:
  - **SQL DDL**: PostgreSQL, MySQL, SQLite, SQL Server
  - **ORM Schemas**: Prisma, Django Models, Laravel Migrations, TypeORM Entities
  - **JSON**: Native format for backup and import
- **Import Support**:
  - **Django Models**: Complete parsing with relationship extraction
  - **JSON Schema**: Import previously saved schemas
  - **Auto-Layout**: Intelligent table positioning with multiple algorithms

### Advanced Features
- **Auto-Layout System**: Force-directed, hierarchical, circular, and grid layouts
- **Schema Validation**: Error detection and optimization suggestions
- **Theme Support**: Dark/light mode with system preference detection
- **Responsive Design**: Optimized for various screen sizes
- **Type Safety**: Full TypeScript implementation with strict type checking

## Tech Stack

### Frontend
- **Framework**: Next.js 16.0 with App Router
- **UI Library**: React 19.2 with TypeScript 5
- **State Management**: Zustand for lightweight, performant state management
- **Canvas**: React Flow (@xyflow/react) for interactive diagrams
- **Styling**: Tailwind CSS 4 with PostCSS
- **Components**: Radix UI primitives for accessible, unstyled components
- **Icons**: Lucide React for consistent iconography
- **Notifications**: Sonner for toast notifications
- **Theming**: next-themes for dark/light mode support

### Development Tools
- **Build Tool**: Next.js with Turbopack enabled
- **Linting**: ESLint with Next.js configuration
- **Type Checking**: TypeScript strict mode
- **Package Manager**: bun (recommended, compatible with yarn, pnpm, npm)

## Quick Start

### Prerequisites

- Node.js 18.0 or higher
- bun (recommended), yarn, pnpm, or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/amaruki/schema-canvas.git
   cd schema-canvas
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   bun run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000) to see SchemaCanvas in action.

### Production Build

```bash
bun run build
bun start
```

## Usage Guide

### Creating Your First Schema

1. **Add Tables**: Press `Ctrl+T` or use the toolbar button to add a new table
2. **Edit Tables**: Double-click the table header to rename it
3. **Add Columns**: Click on a table to add columns with various data types
4. **Create Relationships**: Drag from one column to another to create foreign key relationships
5. **Export Your Schema**: Press `Ctrl+E` to export in your preferred format

### Supported Data Types

- **String**: `string`, `text`, `uuid`
- **Numbers**: `integer`, `float`, `decimal`, `bigint`
- **Date/Time**: `timestamp`, `date`, `time`
- **Boolean**: `boolean`
- **JSON**: `json`, `jsonb`
- **Binary**: `binary`, `blob`
- **Network**: `inet`, `cidr`

### Export Formats

#### SQL DDL
Generates native SQL CREATE TABLE statements for:
- PostgreSQL (`--dialect=postgresql`)
- MySQL (`--dialect=mysql`)
- SQLite (`--dialect=sqlite`)
- SQL Server (`--dialect=sqlserver`)

#### ORM Schemas
- **Prisma**: Complete schema.prisma with models and relations
- **Django**: Models.py with field types and relationships
- **Laravel**: Migration files with Schema facade
- **TypeORM**: TypeScript entities with decorators

## Documentation

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx          # Main application page
├── components/            # React components
│   ├── schema/           # Schema-specific components
│   │   ├── schema-canvas.tsx
│   │   ├── table-node.tsx
│   │   ├── relationship-edge.tsx
│   │   └── context-menus/
│   ├── export/           # Export functionality
│   ├── import/           # Import functionality
│   ├── ui/               # Reusable UI components
│   └── theme/            # Theme provider
├── features/             # Feature-based modules
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
│   ├── export/          # Export managers
│   ├── import/          # Import parsers
│   └── layout/          # Auto-layout algorithms
├── services/            # Business logic
├── stores/              # Zustand stores
└── types/               # TypeScript definitions
```

### API Reference

#### Schema Store
```typescript
interface SchemaStore {
  tables: Table[]
  relationships: Relationship[]
  selectedTables: string[]
  // Actions
  addTable: (table: Table) => void
  updateTable: (id: string, updates: Partial<Table>) => void
  deleteTable: (id: string) => void
  addRelationship: (relationship: Relationship) => void
  // ... more actions
}
```

#### Export Manager
```typescript
interface ExportManager {
  exportToSQL: (dialect: SQLDialect) => string
  exportToPrisma: () => string
  exportToDjango: () => string
  exportToLaravel: () => string
  exportToTypeORM: () => string
  exportToJSON: () => string
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run the linter**
   ```bash
   bun run lint
   ```
5. **Submit a pull request**

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

### Planned Features

- **Real-time Collaboration**: Multi-user editing with WebSocket support
- **Advanced Validation**: Schema validation and optimization suggestions
- **Database Reverse Engineering**: Import from live databases
- **Template System**: Pre-built schema templates for common patterns
- **Analytics**: Schema complexity analysis and insights
- **Integration APIs**: API for third-party integrations

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React Flow](https://reactflow.dev/) for the powerful diagramming library
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Next.js](https://nextjs.org/) for the React framework
- [Zustand](https://github.com/pmndrs/zustand) for state management

## Support

- Email: krilinamar@gmail.com
- Issues: [GitHub Issues](https://github.com/amaruki/schema-canvas/issues)

---

<div align="center">

**Built with love by the developer community**

[Star this repo](https://github.com/amaruki/schema-canvas)

</div>