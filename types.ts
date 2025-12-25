export interface Article {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  authorImage?: string;
  date: string;
  readTime: number; // in minutes
  tags: string[];
  content: string; // Markdown-like string
  image?: string;
}

export interface User {
  name: string;
  bio: string;
  image: string;
}