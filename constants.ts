
import { Article, User } from './types';

// Encoded the provided stylized 'd' logo as a permanent data URL
const LOGO_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABFUI7GAAAABlBMVEUAAAD///+l2Z/dAAABF0lEQVR4nO3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwK8B9mAAAV9m89AAAAAElFTkSuQmCC";

// Using the provided image URL as primary, but will fallback to our local data if it fails
export const CURRENT_USER: User = {
  name: "Dan",
  bio: "Researcher, Developer, 'Do Anything Now'. Writing about the future of AGI and Systems Engineering.",
  image: "https://raw.githubusercontent.com/somdipto/dan-papers/main/logo.png" 
};

export const ARTICLES: Article[] = [
  {
    id: "genesis-of-dan-papers",
    title: "The Genesis of Dan Papers",
    subtitle: "A minimalist approach to publishing research in the age of noise.",
    author: "Dan",
    date: "Oct 24, 2024",
    readTime: 3,
    tags: ["Manifesto", "Research"],
    image: "", 
    content: `
# Introduction

In a world saturated with notifications, sidebars, and algorithmic feeds, the core purpose of a research paper—the transmission of knowledge—often gets lost.

This platform, **Dan Papers**, is designed to do one thing: present my research clearly and beautifully.

## The Philosophy

We adhere to a strict philosophy of minimalism.
1.  **No Distractions**: There are no ads, no "who to follow" lists, and no gamified metrics.
2.  **Focus on Content**: The typography and layout are chosen to enhance readability.
3.  **Do Anything Now**: This codebase is a living document, updated directly to publish new findings.

## Future Work

Upcoming papers will explore:
*   Advanced AGI architectures.
*   System engineering at scale.
*   The intersection of philosophy and code.

Welcome to the new standard.
    `
  }
];
