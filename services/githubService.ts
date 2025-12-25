
/**
 * GitHub Service
 * Optimized for frontend-only authentication via Device Flow
 */

const CLIENT_ID = 'Ov23liYvXG8F9HhYyX0B'; 

// Helpers for Base64
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

/**
 * Step 1: Request code from GitHub
 */
export const startDeviceFlow = async () => {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      scope: 'repo user'
    })
  });

  if (!response.ok) throw new Error('GitHub API unavailable');
  return await response.json();
};

/**
 * Step 2: Check if user has authorized
 */
export const pollForToken = async (deviceCode: string) => {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
    })
  });

  return await response.json();
};

export const getGitHubUser = async (token: string) => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    }
  });
  if (!response.ok) throw new Error(`Identity check failed`);
  return await response.json();
};

export const fetchFileContent = async (config: GitHubConfig) => {
  const branch = config.branch || 'main';
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${branch}&t=${Date.now()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File not found. Please ensure you have a repo named '${config.repo}' with 'constants.ts'.`);
    }
    throw new Error(`Sync Error: ${response.status}`);
  }

  const data = await response.json();
  return { content: b64_to_utf8(data.content), sha: data.sha };
};

export const updateFileContent = async (config: GitHubConfig, content: string, sha: string, message: string) => {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
  const body = {
    message,
    content: utf8_to_b64(content),
    sha,
    branch: config.branch || 'main'
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${config.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Push failed.`);
  }

  return await response.json();
};
