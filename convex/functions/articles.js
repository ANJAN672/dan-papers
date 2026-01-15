import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { auth } from "../auth";

// Helper to validate image URLs
function validateImage(url) {
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Invalid protocol: ${parsed.protocol}`);
    }
  } catch (e) {
    throw new Error(`Invalid image URL: ${url}`);
  }
}

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
    // authorId is no longer trusted from client
    // authorId: v.string(), 
    // authorName is still useful if we want to snap-shot it, but ideally we fetch from profile
    authorName: v.string(),
    authorImage: v.optional(v.string()),
    content: v.string(),
    tags: v.array(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (args.image) {
      validateImage(args.image);
    }

    const now = Date.now();
    const readTime = Math.max(1, Math.ceil(args.content.split(/\s+/).length / 200));

    const articleId = await ctx.db.insert("articles", {
      title: args.title,
      subtitle: args.subtitle,
      authorId: userId, // Enforce server-side authorId
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
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const article = await ctx.db.get(args.id);
    if (!article) {
      throw new Error("Article not found");
    }

    if (article.authorId !== userId) {
      throw new Error("Unauthorized: You do not own this article");
    }

    if (args.image) {
      validateImage(args.image);
    }

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
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    // Check if user is an admin
    const admins = ["somdipto", "KhalandarS"];
    const isAdmin = admins.includes(user?.username);

    const article = await ctx.db.get(args.id);
    if (!article) {
      throw new Error("Article not found");
    }

    if (!isAdmin && article.authorId !== userId) {
      throw new Error("Unauthorized: You do not own this article");
    }

    await ctx.db.delete(args.id);
    return true;
  },
});
