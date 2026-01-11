
const { execSync } = require('child_process');
const fs = require('fs');

const SITE_URL = 'https://abundant-dove-973.convex.site';

try {
    console.log(`Setting SITE_URL to ${SITE_URL}...`);
    execSync(`npx convex env set SITE_URL=${SITE_URL}`, { stdio: 'inherit' });

    console.log("Updating local .env file...");
    // Read current .env to check if it exists to avoid double append
    const currentEnv = fs.readFileSync('.env', 'utf8');
    if (!currentEnv.includes('SITE_URL=')) {
        fs.appendFileSync('.env', `\nSITE_URL=${SITE_URL}\n`);
        console.log("Appended to .env");
    } else {
        console.log("SITE_URL already in .env");
    }

    console.log("Success.");
} catch (error) {
    console.error("Error:", error.message);
}
