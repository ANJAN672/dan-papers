import { query, mutation } from "../_generated/server";
import { auth } from "../auth";
import { v } from "convex/values";

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // App profiles are optional; auth identity is the source of truth.
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    return profile;
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Get the user ID from auth (this is the Convex Auth users table _id)
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    // Query the Convex Auth users table directly
    const authUser = await ctx.db.get(userId);

    // Return user data from Convex Auth users table
    return {
      userId: String(userId),
      name: authUser?.name ?? identity.name ?? "User",
      email: authUser?.email ?? identity.email ?? undefined,
      image: authUser?.image ?? identity.pictureUrl ?? undefined,
    };
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const profileId = await ctx.db.insert("profiles", {
      userId: args.userId,
      name: args.name,
      email: args.email,
      image: args.image,
      createdAt: now,
    });

    return profileId;
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
