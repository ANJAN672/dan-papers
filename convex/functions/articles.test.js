import { describe, it, expect, vi, beforeEach } from 'vitest';
import { remove } from './articles.js';

// Mock dependencies
vi.mock('../_generated/server', () => ({
    mutation: (config) => config, // Return the config object so we can access handler
    query: (config) => config
}));

vi.mock('../auth', () => ({
    auth: {
        getUserId: vi.fn()
    }
}));

// We need to re-import auth to access the mocked function
import { auth } from '../auth';

// Mock v from convex/values
vi.mock('convex/values', () => ({
    v: {
        id: () => 'id',
        string: () => 'string',
        optional: () => 'optional',
        array: () => 'array'
    }
}));

describe('Article Deletion Logic', () => {
    let mockCtx;
    let mockDb;

    beforeEach(() => {
        mockDb = {
            get: vi.fn(),
            delete: vi.fn()
        };
        mockCtx = {
            db: mockDb
        };
        vi.clearAllMocks();
    });

    it('allows admin "somdipto" to delete any article', async () => {
        // Setup
        const userId = 'admin-id';
        const articleId = 'article-123';

        // Auth returns admin ID
        auth.getUserId.mockResolvedValue(userId);

        // User lookup returns admin user
        mockDb.get.mockImplementation((id) => {
            if (id === userId) return { username: 'somdipto' };
            if (id === articleId) return { authorId: 'other-user', _id: articleId };
            return null;
        });

        // Act
        await remove.handler(mockCtx, { id: articleId });

        // Assert
        expect(mockDb.delete).toHaveBeenCalledWith(articleId);
    });

    it('allows admin "KhalandarS" to delete any article', async () => {
        // Setup
        const userId = 'admin-id-2';
        const articleId = 'article-456';

        auth.getUserId.mockResolvedValue(userId);

        mockDb.get.mockImplementation((id) => {
            if (id === userId) return { username: 'KhalandarS' };
            if (id === articleId) return { authorId: 'other-user', _id: articleId };
            return null;
        });

        await remove.handler(mockCtx, { id: articleId });

        expect(mockDb.delete).toHaveBeenCalledWith(articleId);
    });

    it('prevents regular user from deleting others article', async () => {
        const userId = 'regular-id';
        const articleId = 'article-789';

        auth.getUserId.mockResolvedValue(userId);

        mockDb.get.mockImplementation((id) => {
            if (id === userId) return { username: 'regularjoe' };
            if (id === articleId) return { authorId: 'other-user', _id: articleId };
            return null;
        });

        await expect(remove.handler(mockCtx, { id: articleId }))
            .rejects
            .toThrow('Unauthorized: You do not own this article');

        expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('allows regular user to delete their own article', async () => {
        const userId = 'regular-id';
        const articleId = 'article-own';

        auth.getUserId.mockResolvedValue(userId);

        mockDb.get.mockImplementation((id) => {
            if (id === userId) return { username: 'regularjoe' };
            if (id === articleId) return { authorId: 'regular-id', _id: articleId };
            return null;
        });

        await remove.handler(mockCtx, { id: articleId });

        expect(mockDb.delete).toHaveBeenCalledWith(articleId);
    });
});
