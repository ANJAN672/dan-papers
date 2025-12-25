import React from 'react';
import { Link } from 'react-router-dom';
import { Article } from '../types';
import { CURRENT_USER } from '../constants';

interface ArticleCardProps {
  article: Article;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  return (
    <div className="bg-white dark:bg-[#0c0c0c] p-6 md:p-8 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:hover:border-zinc-600 transition-all duration-300 w-full group mb-6">
      <div className="flex justify-between gap-8 items-start md:items-center">
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-sans text-gray-500 dark:text-zinc-400">
            <img 
              src={article.author === CURRENT_USER.name ? CURRENT_USER.image : `https://api.dicebear.com/7.x/initials/svg?seed=${article.author}`} 
              alt={article.author} 
              className="w-6 h-6 rounded-full object-cover border border-gray-100 dark:border-zinc-800"
            />
            <span className="font-medium text-medium-black dark:text-zinc-200">{article.author}</span>
            <span>·</span>
            <span>{article.date}</span>
          </div>

          <Link to={`/article/${article.id}`} className="block">
            <h2 className="text-xl md:text-2xl font-bold text-medium-black dark:text-white leading-tight group-hover:text-gray-700 dark:group-hover:text-zinc-300 transition-colors mb-2">
              {article.title}
            </h2>
            <p className="hidden md:block text-gray-600 dark:text-zinc-400 font-serif text-base line-clamp-2 leading-relaxed">
              {article.subtitle}
            </p>
          </Link>

          <div className="flex items-center gap-3 mt-2">
             <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-3 py-1 rounded-full text-[10px] uppercase tracking-wide font-sans font-medium">
                {article.tags[0] || 'Research'}
              </span>
              <span className="text-xs text-gray-400 dark:text-zinc-500 font-sans">
                {article.readTime} min read
              </span>
          </div>
        </div>

        {article.image && (
          <Link to={`/article/${article.id}`} className="shrink-0 ml-4">
             <img 
              src={article.image} 
              alt={article.title} 
              className="w-28 h-28 md:w-36 md:h-28 object-cover rounded-lg transition-all duration-500 border border-gray-100 dark:border-zinc-800"
            />
          </Link>
        )}
      </div>
    </div>
  );
};

export default ArticleCard;