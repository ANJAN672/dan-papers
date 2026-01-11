
const crypto = require('crypto');
const fs = require('fs');
const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
const envContent = `VITE_CONVEX_URL=https://abundant-dove-973.convex.cloud
CONVEX_DEPLOYMENT=dev:abundant-dove-973
AUTH_GITHUB_ID=Ov23liDXOgPfGRvmDqUD
AUTH_GITHUB_SECRET=dc4ed5c48ff026bda4991a429d5b551d686091d0
GEMINI_API_KEY=AIzaSyA90G4ZM7eLQRR5_EQWdlUzK9YY4k77R6I
JWT_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"
`;
fs.writeFileSync('.env', envContent, { encoding: 'utf8' });
console.log('Fixed .env file');
