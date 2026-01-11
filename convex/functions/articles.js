import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_date")
      .collect();
    return articles;
  },
});

export const getById = query({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.id);
    return article;
  },
});

export const getByAuthor = query({
  args: { authorId: v.string() },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .collect();
    return articles;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    subtitle: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    authorImage: v.optional(v.string()),
    content: v.string(),
    tags: v.array(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const readTime = Math.max(1, Math.ceil(args.content.split(/\s+/).length / 200));

    const articleId = await ctx.db.insert("articles", {
      title: args.title,
      subtitle: args.subtitle,
      authorId: args.authorId,
      authorName: args.authorName,
      authorImage: args.authorImage,
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      readTime,
      tags: args.tags,
      image: args.image,
      content: args.content,
      published: true,
      createdAt: now,
      updatedAt: now,
    });

    return articleId;
  },
});

export const update = mutation({
  args: {
    id: v.id("articles"),
    title: v.string(),
    subtitle: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();

    const readTime = Math.max(1, Math.ceil(updates.content.split(/\s+/).length / 200));

    await ctx.db.patch(id, {
      ...updates,
      readTime,
      updatedAt: now,
    });

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});
