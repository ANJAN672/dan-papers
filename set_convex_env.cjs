
const { execSync } = require('child_process');

try {
    console.log("Setting AUTH_GITHUB_ID...");
    execSync('npx convex env set AUTH_GITHUB_ID=Ov23liDXOgPfGRvmDqUD', { stdio: 'inherit' });

    console.log("Setting AUTH_GITHUB_SECRET...");
    // Using a simplified way to avoid shell meta-char issues if any, though typical alphanumeric is fine
    execSync('npx convex env set AUTH_GITHUB_SECRET=dc4ed5c48ff026bda4991a429d5b551d686091d0', { stdio: 'inherit' });

    console.log("Environment variables set successfully.");
} catch (error) {
    console.error("Failed to set environment variables:", error.message);
}
