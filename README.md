---
title: Basics
toc: false
order: 1
---

# Baby Names Explorer

A modern, full-stack React application for exploring and selecting baby names. Built with React 19, React Router v7, TypeScript, Tailwind CSS v4, and Supabase.

## Features

### Core Features

- **Name Search & Filtering**: Search names by text, gender, origin, popularity, and more
- **Name Details**: Comprehensive information including meaning, etymology, origin, and popularity trends
- **Favorites & Collections**: Save favorite names and organize them into custom collections
- **AI-Powered Suggestions**: Get personalized name recommendations using OpenAI
- **User Authentication**: Secure signup/login with Supabase Auth
- **Responsive Design**: Beautiful, mobile-first UI with Tailwind CSS

### Advanced Features

- **Real-time Collaboration**: Share collections with partners
- **Popularity Analytics**: View trending names and popularity charts
- **Name Pronunciation**: Audio pronunciation for names
- **Random Name Generator**: Discover new names with random suggestions
- **Export & Share**: Export favorites and share collections

## Tech Stack

### Frontend

- **React 19**: Latest React with concurrent features
- **React Router v7**: Full-stack React framework (formerly Remix)
- **TypeScript**: Type-safe development
- **Tailwind CSS v4**: Utility-first CSS framework with modern features
- **Heroicons**: Beautiful SVG icons
- **Vite**: Fast build tool and dev server

### Backend & Database

- **Supabase**: Backend-as-a-Service with PostgreSQL, Auth, and Real-time
- **Row Level Security (RLS)**: Secure data access policies
- **OpenAI API**: AI-powered name suggestions

### Development Tools

- **Husky**: Git hooks for code quality
- **Prettier**: Code formatting
- **lint-staged**: Pre-commit linting
- **TypeScript**: Static type checking

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Names
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env.local
   ```

   Fill in your environment variables:

   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

   # OpenAI Configuration (optional)
   VITE_OPENAI_API_KEY=your_openai_api_key_here

   # App Configuration
   VITE_APP_NAME=Baby Names Explorer
   VITE_APP_VERSION=1.0.0
   ```

4. **Set up the database**
   - Create a new Supabase project
   - Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
   - This will create all necessary tables, policies, and sample data

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## Database Schema

The application uses a PostgreSQL database with the following main tables:

- **`names`**: Stores name information (name, gender, origin, meaning, popularity)
- **`profiles`**: User profiles (extends Supabase auth.users)
- **`favorites`**: User's favorite names
- **`collections`**: Custom name collections

### Key Features

- **Row Level Security (RLS)**: Secure data access
- **Real-time subscriptions**: Live updates
- **Full-text search**: Efficient name searching
- **Triggers**: Automatic timestamp updates

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main app layout with navigation
│   └── LoadingSpinner.tsx
├── hooks/              # Custom React hooks
│   └── useAuth.ts      # Authentication hook
├── lib/                # Utility libraries
│   └── supabase.ts     # Supabase client and types
├── pages/              # Page components
│   ├── HomePage.tsx
│   ├── SearchPage.tsx
│   ├── LoginPage.tsx
│   └── ...
├── App.tsx             # Main app component with routing
├── main.tsx            # App entry point
└── index.css           # Global styles with Tailwind
```

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run serve`: Preview production build
- `npm run format`: Format code with Prettier
- `npm run format:check`: Check code formatting

## Authentication

The app uses Supabase Auth for user management:

- **Sign up**: Create account with email verification
- **Sign in**: Email/password authentication
- **Password reset**: Email-based password recovery
- **Protected routes**: Automatic authentication checks

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting provider
3. Configure environment variables on your hosting platform

## Development Guidelines

### Code Quality

- Pre-commit hooks ensure code formatting
- TypeScript provides type safety
- ESLint catches common issues

### Git Workflow

- Use conventional commits
- Pre-commit hooks run automatically
- Format code before committing

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and formatting
5. Submit a pull request

## Environment Variables

| Variable                 | Description                    | Required |
| ------------------------ | ------------------------------ | -------- |
| `VITE_SUPABASE_URL`      | Supabase project URL           | Yes      |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key         | Yes      |
| `VITE_OPENAI_API_KEY`    | OpenAI API key for AI features | No       |
| `VITE_APP_NAME`          | Application name               | No       |
| `VITE_APP_VERSION`       | Application version            | No       |

## Features Roadmap

### Phase 1 (MVP) ✅

- [x] Project setup and authentication
- [x] Basic UI components and layout
- [x] Database schema and sample data
- [x] User authentication flow

### Phase 2 (Core Features) 🚧

- [ ] Name search and filtering
- [ ] Name details pages
- [ ] Favorites functionality
- [ ] Collections management

### Phase 3 (Advanced Features) 📋

- [ ] AI-powered suggestions
- [ ] Real-time collaboration
- [ ] Popularity analytics
- [ ] Name pronunciation
- [ ] Mobile app (React Native)

## Support

For questions or issues:

1. Check the documentation
2. Search existing issues
3. Create a new issue with details
4. Contact the development team

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ for expecting parents everywhere.
