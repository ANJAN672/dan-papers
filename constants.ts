import { Article, User } from './types';

export const CURRENT_USER: User = {
  name: "Dan",
  bio: "Researcher, Developer, 'Do Anything Now'. Writing about the future of AGI and Systems Engineering.",
  image: "./dan-logo.jpg"
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
    image: "https://picsum.photos/800/400?grayscale",
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