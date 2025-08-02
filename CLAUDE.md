# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build for production (includes data splitting step)
- `npm run serve` - Preview production build locally

### Code Quality & Formatting

- `npm run format` - Format all code with Prettier
- `npm run format:check` - Check code formatting without changes

### Data Processing

- `npm run split-data` - Split JSON data files into chunks for Vercel deployment
- `npm run process-csv` - Convert CSV data files to JSON format

### Database Setup

- Run SQL from `database/schema.sql` in Supabase SQL editor to set up database schema
- Database includes RLS policies, triggers, and sample data

## Architecture Overview

### Tech Stack

- **Frontend**: React 18.3.1 + TypeScript + Vite
- **Routing**: React Router v6.24.0
- **Styling**: Tailwind CSS v3.4.4
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **AI Integration**: OpenAI API for name recommendations
- **Deployment**: Optimized for Vercel with chunked JSON data

### Key Architectural Patterns

**Data Architecture**:

- Names data is stored in chunked JSON files in `/public/data/` for Vercel optimization
- Files are split into `boys_chunk_0.json`, `girls_chunk_0.json`, etc.
- Build process automatically splits data via `npm run split-data`

**Authentication Flow**:

- Supabase Auth with email/password and email verification
- Protected routes using `useAuth` hook with session management
- Graceful handling when Supabase is not configured (dev mode)

**Database Schema**:

- `profiles` table extends Supabase auth.users
- `names` table with full-text search capabilities
- `collections` and `favorites` with collaborative features
- Row Level Security (RLS) policies for data access control

### Directory Structure

**Core Directories**:

- `/src/pages/` - Page components (HomePage, SearchPage, LoginPage, etc.)
- `/src/components/` - Reusable UI components (Layout, LoadingSpinner)
- `/src/hooks/` - Custom React hooks (useAuth, useFavorites, useCollections)
- `/src/services/` - API services and data layer integration
- `/src/lib/` - Utility libraries (Supabase client, types)

**Data & Scripts**:

- `/public/data/` - Chunked JSON files for client-side loading
- `/database/` - SQL schema files for database setup
- `/scripts/` - Data processing utilities (CSV to JSON conversion, data splitting)
- `/data/` - Raw CSV source files

### Environment Configuration

Required environment variables:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here  # Optional for AI features
```

The application gracefully handles missing Supabase configuration for development.

### State Management Patterns

**Authentication**: Global auth state via `useAuth` hook with Supabase session management
**Data Fetching**: Direct Supabase client calls in components with real-time subscriptions
**UI State**: Local component state with React hooks

### Build Process

1. `npm run split-data` - Processes JSON data into deployment-optimized chunks
2. `tsc` - TypeScript compilation and type checking
3. `vite build` - Production build with code splitting and optimization

The build process is optimized for Vercel deployment with SPA routing configuration.

### Code Quality Setup

- **Husky**: Pre-commit hooks for code quality
- **lint-staged**: Runs Prettier on staged files before commit
- **TypeScript**: Strict mode enabled with ESNext target
- **Prettier**: Consistent code formatting across the project

### Database Patterns

- Use Row Level Security (RLS) policies for data access control
- Real-time subscriptions for collaborative features
- Full-text search capabilities on names table
- Automatic timestamp updates via database triggers
