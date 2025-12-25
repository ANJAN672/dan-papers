import React from 'react';
import { Link } from 'react-router-dom';
import { Article } from '../types';
import { CURRENT_USER } from '../constants';

interface ArticleCardProps {
  article: Article;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300 w-full group mb-6">
      <div className="flex justify-between gap-8 items-start md:items-center">
        <div className="flex-1 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs font-sans text-gray-500">
            <img 
              src={article.author === CURRENT_USER.name ? CURRENT_USER.image : "https://picsum.photos/24/24?grayscale"} 
              alt={article.author} 
              className="w-6 h-6 rounded-full object-cover border border-gray-100"
            />
            <span className="font-medium text-medium-black">{article.author}</span>
            <span>·</span>
            <span>{article.date}</span>
          </div>

          {/* Title & Subtitle */}
          <Link to={`/article/${article.id}`} className="block">
            <h2 className="text-xl md:text-2xl font-bold text-medium-black leading-tight group-hover:text-gray-700 transition-colors mb-2">
              {article.title}
            </h2>
            <p className="hidden md:block text-gray-600 font-serif text-base line-clamp-2 leading-relaxed">
              {article.subtitle}
            </p>
          </Link>

          {/* Footer Metadata */}
          <div className="flex items-center gap-3 mt-2">
             <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] uppercase tracking-wide font-sans font-medium">
                {article.tags[0]}
              </span>
              <span className="text-xs text-gray-400 font-sans">
                {article.readTime} min read
              </span>
          </div>
        </div>

        {/* Thumbnail Image */}
        {article.image && (
          <Link to={`/article/${article.id}`} className="shrink-0 ml-4">
             <img 
              src={article.image} 
              alt={article.title} 
              className="w-28 h-28 md:w-36 md:h-28 object-cover rounded-lg grayscale hover:grayscale-0 transition-all duration-500 border border-gray-100"
            />
          </Link>
        )}
      </div>
    </div>
  );
};

export default ArticleCard;