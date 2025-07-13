import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { NameDetailsPage } from './pages/NameDetailsPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { ProfilePage } from './pages/ProfilePage';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route
          path="/search"
          element={
            <Layout>
              <SearchPage />
            </Layout>
          }
        />
        <Route
          path="/name/:name"
          element={
            <Layout>
              <NameDetailsPage />
            </Layout>
          }
        />
        <Route
          path="/favorites"
          element={
            <Layout>
              <FavoritesPage />
            </Layout>
          }
        />
        <Route
          path="/collections"
          element={
            <Layout>
              <CollectionsPage />
            </Layout>
          }
        />
        <Route
          path="/profile"
          element={
            <Layout>
              <ProfilePage />
            </Layout>
          }
        />
      </Routes>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}
