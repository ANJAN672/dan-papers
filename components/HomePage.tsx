import React from 'react';
import { ARTICLES } from '../constants';
import ArticleCard from './ArticleCard';

const HomePage: React.FC = () => {
  return (
    <div className="max-w-screen-md mx-auto px-4 mt-8 mb-20">
      <div className="flex flex-col gap-2">
        {ARTICLES.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;