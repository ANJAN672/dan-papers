import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import ArticlePage from './components/ArticlePage';
import WritePage from './components/WritePage';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:id" element={<ArticlePage />} />
          <Route path="/write" element={<WritePage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;