import { query, mutation } from "../_generated/server";
import { auth } from "../auth";
import { v } from "convex/values";

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    return user;
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return user;
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    image: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      userId: args.userId,
      name: args.name,
      email: args.email,
      image: args.image,
      createdAt: now,
    });

    return userId;
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.string(),
    email: v.optional(v.string()),
    image: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});
