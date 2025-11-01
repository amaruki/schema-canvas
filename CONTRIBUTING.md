# Contributing to SchemaCanvas

Thank you for your interest in contributing to SchemaCanvas! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- bun (recommended), yarn, pnpm, or npm
- Git
- A code editor like [VS Code](https://code.visualstudio.com/)
- Basic knowledge of React, TypeScript, and Next.js

### Development Setup

1. **Fork the Repository**
   - Click the "Fork" button on the GitHub repository
   - Clone your fork locally:
     ```bash
     git clone https://github.com/YOUR_USERNAME/schema-canvas.git
     cd schema-canvas
     ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Start Development Server**
   ```bash
   bun run dev
   ```

   The application will be available at `http://localhost:3000`.

4. **Set Up Your Environment**
   - Create a new branch for your feature:
     ```bash
     git checkout -b feature/your-feature-name
     ```
   - Ensure you have the latest changes from the main branch:
     ```bash
     git pull upstream main
     ```

## Project Structure

Understanding the project structure will help you navigate the codebase effectively:

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with theme provider
│   └── page.tsx          # Main application page
├── components/            # React components
│   ├── schema/           # Schema-specific components
│   │   ├── schema-canvas.tsx    # Main canvas component
│   │   ├── table-node.tsx       # Individual table component
│   │   ├── relationship-edge.tsx # Relationship visualization
│   │   └── context-menus/       # Right-click menus
│   ├── export/           # Export functionality
│   ├── import/           # Import functionality
│   ├── ui/               # Reusable UI components
│   └── theme/            # Theme provider
├── features/             # Feature-based modules
│   └── schema/           # Schema feature module
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
│   ├── export/          # Export managers
│   ├── import/          # Import parsers
│   └── layout/          # Auto-layout algorithms
├── services/            # Business logic services
├── stores/              # Zustand stores
└── types/               # TypeScript type definitions
```

## 🛠 Development Workflow

### 1. Code Style Guidelines

#### TypeScript
- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid using `any` type
- Use interfaces for object shapes
- Use type aliases for union types

```typescript
// Good
interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
}

// Avoid
const table: any = {
  id: '1',
  name: 'users'
};
```

#### React Components
- Use functional components with hooks
- Define props interfaces
- Use proper TypeScript typing for props
- Follow React best practices

```typescript
interface TableNodeProps {
  table: Table;
  isSelected: boolean;
  onUpdate: (updates: Partial<Table>) => void;
}

export const TableNode: React.FC<TableNodeProps> = ({
  table,
  isSelected,
  onUpdate
}) => {
  // Component logic
};
```

#### State Management
- Use Zustand for state management
- Create separate stores for different concerns
- Follow Zustand patterns and best practices

```typescript
interface SchemaStore {
  tables: Table[];
  relationships: Relationship[];
  selectedTables: string[];

  // Actions
  addTable: (table: Table) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
}

export const useSchemaStore = create<SchemaStore>((set) => ({
  tables: [],
  relationships: [],
  selectedTables: [],

  addTable: (table) => set((state) => ({
    tables: [...state.tables, table]
  })),

  updateTable: (id, updates) => set((state) => ({
    tables: state.tables.map(table =>
      table.id === id ? { ...table, ...updates } : table
    )
  })),

  deleteTable: (id) => set((state) => ({
    tables: state.tables.filter(table => table.id !== id)
  }))
}));
```

### 2. Component Development

#### File Naming
- Use kebab-case for component files: `table-node.tsx`
- Use PascalCase for component names: `TableNode`
- Group related components in folders

#### Component Structure
```typescript
// imports
import React from 'react';
import { useSchemaStore } from '@/stores/schema-store';

// types
interface ComponentProps {
  // prop definitions
}

// component
export const ComponentName: React.FC<ComponentProps> = ({
  prop1,
  prop2
}) => {
  // hooks
  const { state, actions } = useSchemaStore();

  // event handlers
  const handleClick = () => {
    // handler logic
  };

  // render
  return (
    <div>
      {/* JSX content */}
    </div>
  );
};
```

### 3. Testing

#### Running Tests
```bash
bun run test        # Run all tests
bun run test:watch  # Run tests in watch mode
bun run test:coverage # Run tests with coverage report
```

#### Writing Tests
- Write unit tests for utility functions
- Write integration tests for components
- Use descriptive test names
- Test both happy path and error cases

```typescript
// Example test
describe('TableUtils', () => {
  it('should generate valid table ID', () => {
    const tableName = 'users';
    const id = generateTableId(tableName);

    expect(id).toMatch(/^table-\d+$/);
  });

  it('should handle empty table name', () => {
    const id = generateTableId('');

    expect(id).toMatch(/^table-\d+$/);
  });
});
```

## Bug Reports

When reporting bugs, please include:

1. **Clear Description**: What the bug is and what you expected to happen
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Environment Information**:
   - Operating system
   - Browser version
   - Node.js version
4. **Screenshots**: If applicable, include screenshots
5. **Additional Context**: Any other relevant information

### Bug Report Template

```markdown
## Bug Description
[Clear and concise description of the bug]

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Environment
- OS: [e.g. Windows 11, macOS 13.0]
- Browser: [e.g. Chrome 108, Firefox 107]
- Node.js: [e.g. 18.0.0]

## Screenshots
[If applicable, add screenshots]

## Additional Context
[Add any other context about the problem]
```

## Feature Requests

We welcome feature requests! Please:

1. **Check existing issues**: Search for similar requests
2. **Use the template**: Provide detailed information
3. **Explain the use case**: Why this feature would be useful
4. **Consider alternatives**: Suggest alternative approaches

### Feature Request Template

```markdown
## Feature Description
[Clear and concise description of the feature]

## Problem Statement
[What problem does this feature solve?]

## Proposed Solution
[How would you like this feature to work?]

## Alternatives Considered
[What other approaches did you consider?]

## Additional Context
[Add any other context or screenshots]
```

## Pull Request Process

### 1. Before Creating a PR

- **Test your changes**: Ensure everything works as expected
- **Run the linter**: Fix any code style issues
- **Update documentation**: Update relevant documentation
- **Add tests**: Add tests for new functionality
- **Check existing PRs**: Make sure there isn't a similar PR in progress

### 2. Creating the PR

1. **Create a descriptive title**: Summarize your changes
2. **Provide a detailed description**: Explain what you changed and why
3. **Link to issues**: Reference any related issues
4. **Add screenshots**: For UI changes, include before/after screenshots
5. **Test checklist**: Mark what you've tested

### 3. PR Template

```markdown
## Description
[Brief description of changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing (if applicable)

## Screenshots
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No TypeScript errors
- [ ] Linter passes
```

### 4. Code Review Process

- **Be responsive**: Address feedback promptly
- **Be constructive**: Provide helpful feedback on others' PRs
- **Be patient**: Reviews may take time
- **Be thorough**: Ensure code quality is maintained

## 🏗 Architecture Guidelines

### Component Architecture

- **Single Responsibility**: Each component should have one clear purpose
- **Composition over Inheritance**: Use composition to build complex UI
- **Props Interface**: Define clear interfaces for component props
- **State Management**: Use appropriate state management solutions

### File Organization

- **Feature-based structure**: Group files by feature rather than type
- **Consistent naming**: Use consistent naming conventions
- **Index files**: Use index files for clean imports
- **Barrel exports**: Export related functionality together

### Performance Considerations

- **React.memo**: Use memoization for expensive components
- **useCallback/useMemo**: Optimize expensive calculations
- **Code splitting**: Use dynamic imports for large components
- **Bundle size**: Monitor and optimize bundle size

## Development Tools

### Recommended VS Code Extensions

- **TypeScript Importer**: Auto-imports TypeScript modules
- **Prettier**: Code formatting
- **ESLint**: Code linting
- **GitLens**: Git integration
- **Tailwind CSS IntelliSense**: CSS class suggestions

### Useful Scripts

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run lint         # Run ESLint
bun run lint:fix     # Fix linting issues automatically
bun run type-check   # Run TypeScript compiler
```

## Learning Resources

### React & TypeScript
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Learn Course](https://nextjs.org/learn)

### State Management
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React State Management Guide](https://react.dev/learn/state-a-components-memory)

### Styling
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/)

## Community Guidelines

### Code of Conduct

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome contributors from all backgrounds
- **Be constructive**: Provide helpful and constructive feedback
- **Be patient**: Remember that everyone has different levels of experience

### Getting Help

- **GitHub Issues**: Use GitHub issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Documentation**: Check existing documentation first
- **Search**: Search for similar questions before asking

## Recognition

Contributors will be recognized in **README.md**: Listed as contributors

Thank you for contributing to SchemaCanvas! Your contributions help make this project better for everyone.