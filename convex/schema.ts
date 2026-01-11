import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    image: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("email", ["email"]), // Added to fix "Index users.email not found" error

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
