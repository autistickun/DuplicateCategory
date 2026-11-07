# Duplicate Category for Vencord

Adds **Duplicate Category** below **Edit Category** in a server category's context menu. The dialog lets you change the category name and choose whether to copy the original permission overwrites. Copy Permissions is enabled by default; turn it off to use the server's default permissions. Requires Manage Channels.

## Install as a user plugin

Copy `index.tsx` to `src/userplugins/duplicateCategory/index.tsx` in a Vencord source checkout, build Vencord, and enable **DuplicateCategory** in plugin settings.

## Vencord submission

The proposed built-in version is the same source file at `src/plugins/duplicateCategory/index.tsx`. Built-in plugins receive Vencord's standard GitHub header button. The custom-plugin header patch used for the local installation is not part of this submission.

The source was implemented with Codex assistance and reviewed against Vencord's plugin conventions. TypeScript, ESLint, and the development build passed.

