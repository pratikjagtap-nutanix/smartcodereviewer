const { Octokit } = require("@octokit/rest");

async function createPullRequest() {
  // Replace with your personal access token
  const token = "TOKEN";

  // Create a new Octokit object with authentication
  const octokit = new Octokit({ auth: token });

  // Set the owner, repo, branch, and file path
  const owner = "SmartCodeRivew";
  const repo = "smartcodereviewer";
  const branch = "main";
  const filePath = "sample_code.js";


  // Get the latest commit SHA for the specified branch
  const { data: branchData } = await octokit.repos.getBranch({
    owner,
    repo,
    branch,
  });

  const latestCommitSha = branchData.commit.sha;

  // Get the tree SHA for the latest commit
  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });

  const treeSha = commitData.tree.sha;

  // Get the content of the file at the specified path
  const { data: fileData } = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref: latestCommitSha,
  });

  // Base64 decode the file content
  const fileContents = Buffer.from(fileData.content, 'base64').toString();

  // Modify the file content
  const newFileContents = fileContents.replace(/Hello/g, "Hello World");

  // Base64 encode the new file content
  const newFileContentEncoded = Buffer.from(newFileContents).toString('base64');

  // Create a new branch for the changes
  const newBranchName = `update-${filePath}-${Date.now()}`;
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranchName}`,
    sha: latestCommitSha,
  });

  // Create a new tree object with the updated file content
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    tree: [
      {
        path: filePath,
        mode: '100644',
        type: 'blob',
        content: newFileContents,
      },
    ],
    base_tree: treeSha,
  });

  // Create a new commit with the updated file content
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: `Update ${filePath}`,
    tree: newTree.sha,
    parents: [latestCommitSha],
    author: {
      name: "Your Name",
      email: "your.email@example.com",
    },
    committer: {
      name: "Your Name",
      email: "your.email@example.com",
    },
    signature: "-----BEGIN PGP SIGNATURE-----...",
  });

  // Update the branch reference to the new commit
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${newBranchName}`,
    sha: newCommit.sha,
  });

  // Create a pull request for the changes
  const { data: pullRequest } = await octokit.pulls.create({
    owner,
    repo,
    title: `Update ${filePath}`,
    head: newBranchName,
    base: branch,
    body: "This is an automated pull request.",
  });

  console.log(`Pull request created: ${pullRequest.html_url}`);
  const prNumber = pullRequest.html_url.match(/\/pull\/(\d+)/)[1];

  async function createCommentOnPR(prNumber, filePath, line, comment) {
    // Get the pull request details
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
  
    // Get the SHA for the head commit
    const headSha = pullRequest.head.sha;
  
    // Get the content of the file at the specified path
    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: headSha,
    });
  
    // Base64 decode the file content
    const fileContents = Buffer.from(fileData.content, 'base64').toString();
  
    // Split the file contents into an array of lines
    const fileLines = fileContents.split('\n');
  
    // Get the line number of the changed line
    const changedLineNumber = parseInt(line, 10);
  
    // Get the line content of the changed line
    const changedLineContent = fileLines[changedLineNumber - 1];
  
    // Create the comment body
    const commentBody = `On line ${changedLineNumber}: ${changedLineContent}\n\n${comment}`;
  
    // Create a comment on the PR
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: commentBody,
    });
  
    console.log(`Comment added to pull request ${prNumber}`);
  }
  createCommentOnPR(prNumber, filePath, 1, "Sample comment");

}

createPullRequest().catch((error) => {
  console.error(error);
});

  
