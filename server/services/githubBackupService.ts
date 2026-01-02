import { invokeLLM } from "../_core/llm";

/**
 * GitHub 备份服务
 * 处理将 Nova 的记忆数据自动备份到 GitHub 仓库
 */

interface GitHubBackupOptions {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
  autoCommit?: boolean;
}

interface BackupResult {
  success: boolean;
  message: string;
  fileUrl?: string;
  commitSha?: string;
  timestamp: string;
}

/**
 * 将数据备份到 GitHub
 */
export async function backupToGitHub(
  data: Record<string, any>,
  options: GitHubBackupOptions
): Promise<BackupResult> {
  const {
    token,
    owner,
    repo,
    branch = "main",
    autoCommit = true,
  } = options;

  const timestamp = new Date().toISOString();
  const fileName = `nova-memories-${timestamp.split("T")[0]}.json`;
  const filePath = `nova-memories-backup/${fileName}`;

  try {
    // 将数据转换为 Base64（GitHub API 要求）
    const jsonString = JSON.stringify(data, null, 2);
    const base64Content = Buffer.from(jsonString).toString("base64");

    // 获取当前文件的 SHA（如果存在）
    let sha: string | undefined;
    try {
      const getResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      }
    } catch (e) {
      // 文件不存在，这是正常的
    }

    // 上传或更新文件
    const uploadResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `🤖 自动备份 Nova-Mind 记忆数据 - ${timestamp}`,
          content: base64Content,
          branch,
          ...(sha && { sha }),
        }),
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(`GitHub API 错误: ${error.message}`);
    }

    const uploadResult = await uploadResponse.json();

    // 如果启用自动提交，创建一个提交记录
    if (autoCommit && uploadResult.commit) {
      const commitMessage = `🤖 Nova-Mind 自动备份 - ${new Date(timestamp).toLocaleString("zh-CN")}`;
      
      // 记录备份事件
      console.log(`[GitHub Backup] 成功备份到 ${filePath}`);
      console.log(`[GitHub Backup] 提交 SHA: ${uploadResult.commit.sha}`);
    }

    return {
      success: true,
      message: `✓ 数据已成功备份到 GitHub`,
      fileUrl: uploadResult.content.html_url,
      commitSha: uploadResult.commit.sha,
      timestamp,
    };
  } catch (error) {
    console.error("[GitHub Backup] 备份失败:", error);
    return {
      success: false,
      message: `❌ 备份失败: ${error instanceof Error ? error.message : "未知错误"}`,
      timestamp,
    };
  }
}

/**
 * 验证 GitHub 令牌
 */
export async function verifyGitHubToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    return response.ok;
  } catch (error) {
    console.error("[GitHub Backup] 令牌验证失败:", error);
    return false;
  }
}

/**
 * 获取 GitHub 用户信息
 */
export async function getGitHubUserInfo(token: string) {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error("无法获取用户信息");
    }

    const data = await response.json();
    return {
      login: data.login,
      name: data.name,
      avatar_url: data.avatar_url,
    };
  } catch (error) {
    console.error("[GitHub Backup] 获取用户信息失败:", error);
    throw error;
  }
}

/**
 * 获取用户的仓库列表
 */
export async function getGitHubRepositories(token: string) {
  try {
    const response = await fetch("https://api.github.com/user/repos?per_page=100", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error("无法获取仓库列表");
    }

    const repos = await response.json();
    return repos.map((repo: any) => ({
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      url: repo.html_url,
      description: repo.description,
    }));
  } catch (error) {
    console.error("[GitHub Backup] 获取仓库列表失败:", error);
    throw error;
  }
}

/**
 * 获取备份历史
 */
export async function getBackupHistory(
  token: string,
  owner: string,
  repo: string
): Promise<Array<{ name: string; date: string; url: string }>> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/nova-memories-backup`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const files = await response.json();
    return files
      .filter((file: any) => file.name.endsWith(".json"))
      .map((file: any) => ({
        name: file.name,
        date: file.name.replace("nova-memories-", "").replace(".json", ""),
        url: file.html_url,
      }))
      .sort((a: any, b: any) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error("[GitHub Backup] 获取备份历史失败:", error);
    return [];
  }
}

/**
 * 创建或获取备份分支
 */
export async function ensureBackupBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string = "nova-backups"
): Promise<boolean> {
  try {
    // 首先尝试获取分支
    const getResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branchName}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (getResponse.ok) {
      return true; // 分支已存在
    }

    // 获取主分支的最新提交
    const mainResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!mainResponse.ok) {
      throw new Error("无法获取主分支信息");
    }

    const mainData = await mainResponse.json();
    const sha = mainData.object.sha;

    // 创建新分支
    const createResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha,
        }),
      }
    );

    return createResponse.ok;
  } catch (error) {
    console.error("[GitHub Backup] 创建备份分支失败:", error);
    return false;
  }
}
