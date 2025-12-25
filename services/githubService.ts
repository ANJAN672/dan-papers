// Helpers for UTF-8 Base64 encoding/decoding
function utf8_to_b64(str: string) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str: string) {
  return decodeURIComponent(escape(window.atob(str)));
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
  branch?: string;
}

export interface CommitOptions {
  message: string;
  // name/email removed to rely on Token Identity
}

const cleanToken = (token: string) => {
  let t = token.trim();
  if (t.toLowerCase().startsWith('bearer ')) {
    t = t.slice(7).trim();
  }
  return t;
};

export const getGitHubUser = async (token: string) => {
  const clean = cleanToken(token);
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${clean}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    return await response.json(); // Returns user object { login, name, id, ... }
  } catch (error) {
    console.error("Error fetching GitHub user:", error);
    throw error;
  }
};

export const fetchFileContent = async (config: GitHubConfig) => {
  // Use configured branch or default to 'main'
  const branch = config.branch || 'main';
  
  // Add timestamp to bypass browser cache without triggering CORS preflight
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${branch}&t=${Date.now()}`;
  const token = cleanToken(config.token);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!response.ok) {
      // 404 for Private Repos often means the Token doesn't have access to see it at all
      if (response.status === 404) throw new Error(`File not found (404). If this is a PRIVATE repo, ensure your Token has the 'repo' scope.`);
      if (response.status === 401) throw new Error('Unauthorized (401). Token invalid or expired.');
      if (response.status === 403) throw new Error('Forbidden (403). API Rate limit or blocked access.');
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = b64_to_utf8(data.content);
    return { content, sha: data.sha };
  } catch (error: any) {
    console.error("GitHub Fetch Error:", error);
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network Error: Request blocked. Check your internet connection or CORS settings.');
    }
    throw error;
  }
};

export const updateFileContent = async (
  config: GitHubConfig, 
  content: string, 
  sha: string, 
  options: CommitOptions
) => {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
  const token = cleanToken(config.token);
  const branch = config.branch || 'main';

  try {
    const body: any = {
      message: options.message,
      content: utf8_to_b64(content),
      sha,
      branch: branch
    };

    // REMOVED: Custom committer object. 
    // This forces GitHub to use the identity associated with the API Token (GPG/Verification style).

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized (401). Token cannot push code.');
      if (response.status === 403) {
          // Detailed 403 Diagnostics
          throw new Error('Permission Denied (403). Private Repo access requires the "repo" scope (Classic Token). If using SSO (Organization), authorize the token for the Org.');
      }
      if (response.status === 404) throw new Error('Repo not found (404). For Private Repos, check Token "repo" scope.');
      if (response.status === 409) throw new Error('Conflict (409). File changed remotely. Try again.');
      if (response.status === 422) throw new Error(`Unprocessable (422). Branch '${branch}' might be protected or invalid.`);
      throw new Error(`Failed to push: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("GitHub Push Error:", error);
     if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network Error: Push blocked. Check your internet connection.');
    }
    throw error;
  }
};