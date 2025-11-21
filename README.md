# Trebuchet Designer

A web-based trebuchet simulation and design tool.

[Live Demo](https://hastingsgreer.github.io/jstreb)

## Development

```bash
yarn
npx vite
```

## Testing

### Unit Tests
```bash
yarn test
```

### E2E Tests

#### Local Testing (Requires Browser Installation)
```bash
# Install Playwright browsers
npx playwright install chromium

# Run tests
yarn test:e2e

# Run with UI mode
yarn test:e2e:ui

# Debug mode
yarn test:e2e:debug
```

#### Local Testing (Using Docker - Recommended)
No browser installation needed! Run tests in the same Docker container used by CI:

```bash
./test-e2e-docker.sh
```

This requires Docker to be installed on your system.
