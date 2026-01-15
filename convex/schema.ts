import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    username: v.optional(v.string()),
  }).index("email", ["email"]),
  // App-specific user profile data (do NOT name this table "users" since
  // Convex Auth's authTables already includes a "users" table).
  profiles: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  articles: defineTable({
    title: v.string(),
    subtitle: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    authorImage: v.optional(v.string()),
    date: v.string(),
    readTime: v.number(),
    tags: v.array(v.string()),
    image: v.optional(v.string()),
    content: v.string(),
    published: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_date", ["date"]),
});
