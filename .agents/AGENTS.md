# Workspace Rules

- Whenever any frontend modifications are made in the `LeaveManagementSystem/frontend` directory and verified, always propose and execute the `npm run deploy` command in the `LeaveManagementSystem/frontend` directory to deploy the changes to GitHub Pages.

- Always maintain and update the project's `TECHNICAL_DOCUMENT.md` file in the workspace to log the user's requested requirements, implementation progress, execution logs, and response summaries. Before initiating code changes, document the plan and target goals there; after completing changes and testing, update the outcomes and current state so that in case of sudden session terminations or rollbacks, subsequent agents can immediately resume the work seamlessly based on this local record.

- Maintain a persistent 작업 및 응답 이력 (Task & Response Log) in the workspace documentation with timestamps, key decisions, modified files, test outputs, and next steps for zero-context-loss handoffs.

- After any code modifications are verified (build passes), always run `git add` for the changed files and `git commit` with a descriptive message, then `git push origin master` — all executed from the `LeaveManagementSystem/frontend` directory (which is connected to the `leave-management-server` GitHub remote). The commit message should follow the conventional commits format (e.g., `feat:`, `fix:`, `perf:`, `refactor:`).

- Always run browser control tasks, web automation, and browser subagent operations using isolated, dedicated temporary profiles (clean/incognito user-data-dir). Never attach to or reuse the user's personal/primary browser profile.

- After completing any task or code changes across all projects, always execute thorough tests and validation (e.g. build verification, automated tests, runtime/browser verification) to verify everything works properly, and report the explicit test results to the user.

- Standard User Request Format & Workflow:
  The user provides instructions using a standardized 3-part format:
  1. **프로젝트명 (Project Name)**
  2. **환경/유형 (Online / Offline)**
  3. **작업내용 (Task Description)**
  (예: `1. 새로운 프로젝트. 2. 오프라인. 3. 오프라인 반복작업`)
  When receiving requests in this format, parse the target project and environment (e.g. online web/API vs offline local/desktop automation), record the task plan and logs in `TECHNICAL_DOCUMENT.md`, carry out the implementation and thorough testing, and report the outcomes.





