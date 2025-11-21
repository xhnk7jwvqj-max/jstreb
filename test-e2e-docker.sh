#!/bin/bash

# Script to run Playwright tests locally using Docker
# This allows testing without needing to install browsers locally

set -e

echo "Running Playwright tests in Docker..."

docker run --rm \
  -v "$(pwd):/work" \
  -w /work \
  --ipc=host \
  mcr.microsoft.com/playwright:v1.56.1-jammy \
  /bin/bash -c "npm install -g yarn && yarn install --frozen-lockfile && npx playwright test"

echo ""
echo "Tests completed! Check the output above for results."
echo "To view the HTML report, run: npx playwright show-report"
