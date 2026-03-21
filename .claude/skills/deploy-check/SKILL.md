---
name: deploy-check
description: Check the GitHub Pages deployment status and verify the game is accessible
user-invocable: true
allowed-tools: Bash
---

Check the deployment status of the food-fighters game:

1. Run `gh api repos/atscub/food-fighters/pages/builds --jq '.[0]'` to check the latest Pages build status.
2. If deployed, verify the site is accessible at https://atscub.github.io/food-fighters/
3. Report the status back.
