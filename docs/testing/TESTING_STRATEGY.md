# Testing Strategy

**Document Version:** 1.0  
**Date:** February 2, 2026  
**Phase:** BMAD - DELIVER

---

## 1. Testing Philosophy

### Principles

1. **Test Pyramid** - Many unit tests, some integration tests, few E2E tests
2. **Test-Driven Development** - Write tests before/alongside code when possible
3. **Fast Feedback** - Tests should run quickly (< 5 minutes for full suite)
4. **Reliable** - Tests should be deterministic and not flaky
5. **Maintainable** - Tests should be easy to read and update

### Coverage Goals

| Layer | Target Coverage | Current | Priority |
|-------|----------------|---------|----------|
| Backend Unit | 80% | 0% | High |
| Backend Integration | 60% | 0% | High |
| Frontend Unit | 70% | 0% | Medium |
| Frontend Integration | 50% | 0% | Medium |
| E2E | Critical paths | 0% | Low |

---

## 2. Testing Pyramid

```
                    ┌───────────┐
                   /│   E2E     │\        
                  / │  Tests    │ \       Few, slow, valuable
                 /  └───────────┘  \      (Critical user journeys)
                /   ┌───────────┐   \
               /    │Integration│    \    Some, medium speed
              /     │  Tests    │     \   (API endpoints, DB)
             /      └───────────┘      \
            /       ┌───────────┐       \
           /        │   Unit    │        \   Many, fast
          /         │  Tests    │         \  (Functions, components)
         /          └───────────┘          \
        └──────────────────────────────────┘
```

---

## 3. Backend Testing

### 3.1 Unit Tests

**Framework:** pytest  
**Location:** `backend/tests/unit/`

#### What to Test

- ✅ Business logic functions
- ✅ Data validation (Pydantic schemas)
- ✅ Password hashing/verification
- ✅ JWT token creation/verification
- ✅ File validation utilities
- ✅ Data transformation functions

#### Example Structure

```
backend/tests/unit/
├── test_security.py      # Password hashing, JWT
├── test_validation.py    # Input validation
├── test_utils.py         # Utility functions
└── test_models.py        # Model methods
```

#### Example Test

```python
# backend/tests/unit/test_security.py
import pytest
from app.core.security import verify_password, get_password_hash

def test_password_hashing():
    password = "test_password_123"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed)

def test_password_verification_fails():
    password = "test_password_123"
    wrong_password = "wrong_password"
    hashed = get_password_hash(password)
    assert not verify_password(wrong_password, hashed)
```

### 3.2 Integration Tests

**Framework:** pytest + httpx  
**Location:** `backend/tests/integration/`

#### What to Test

- ✅ API endpoints (happy paths)
- ✅ Database operations
- ✅ Authentication flows
- ✅ File upload/download
- ✅ Error handling

#### Example Structure

```
backend/tests/integration/
├── test_auth.py          # Login, register, me
├── test_materials.py     # CRUD operations
├── test_personas.py      # CRUD operations
├── test_segments.py      # CRUD operations
└── test_file_upload.py   # File operations
```

#### Example Test

```python
# backend/tests/integration/test_auth.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user):
    response = await client.post(
        "/api/auth/login",
        data={
            "username": test_user["email"],
            "password": test_user["password"]
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    response = await client.post(
        "/api/auth/login",
        data={
            "username": "wrong@email.com",
            "password": "wrong_password"
        }
    )
    assert response.status_code == 401
```

### 3.3 Test Fixtures

**Location:** `backend/tests/conftest.py`

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from app.models.user import User

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db_session():
    # Use test database
    yield get_db()
    # Cleanup

@pytest.fixture
def test_user(db_session):
    user = User(
        email="test@ovhcloud.com",
        hashed_password=get_password_hash("test123"),
        full_name="Test User",
        role="pmm"
    )
    db_session.add(user)
    db_session.commit()
    return {"id": user.id, "email": user.email, "password": "test123"}
```

---

## 4. Frontend Testing

### 4.1 Unit Tests

**Framework:** Vitest + React Testing Library  
**Location:** `frontend/src/**/*.test.tsx`

#### What to Test

- ✅ Component rendering
- ✅ User interactions (clicks, form submissions)
- ✅ Conditional rendering
- ✅ Props handling
- ✅ Hook behavior

#### Example Structure

```
frontend/src/
├── components/
│   ├── Button.test.tsx
│   ├── Modal.test.tsx
│   └── MaterialForm.test.tsx
├── pages/
│   ├── Login.test.tsx
│   └── Dashboard.test.tsx
└── utils/
    └── helpers.test.ts
```

#### Example Test

```typescript
// frontend/src/components/Modal.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Modal from './Modal'

describe('Modal', () => {
  it('renders when open', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )
    screen.getByRole('button', { name: /close/i }).click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

### 4.2 Integration Tests

**Framework:** Vitest + React Testing Library + MSW  
**Location:** `frontend/src/**/*.integration.test.tsx`

#### What to Test

- ✅ API calls with mocked responses
- ✅ Form submissions
- ✅ Data fetching and display
- ✅ Error handling
- ✅ Loading states

#### Example Test

```typescript
// frontend/src/pages/Materials.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import Materials from './Materials'
import { api } from '../services/api'

vi.mock('../services/api')

describe('Materials Integration', () => {
  it('fetches and displays materials', async () => {
    const mockMaterials = [
      { id: 1, name: 'Test Material', material_type: 'sales_deck' }
    ]
    
    vi.mocked(api.get).mockResolvedValue({ data: mockMaterials })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Materials />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Material')).toBeInTheDocument()
    })
  })
})
```

---

## 5. End-to-End (E2E) Tests

### 5.1 Framework

**Tool:** Playwright  
**Location:** `e2e/`

### 5.2 Critical Paths to Test

1. **User Authentication**
   - Login with valid credentials
   - Login with invalid credentials
   - Logout

2. **Material Management (PMM)**
   - Upload a new material
   - Edit material metadata
   - Delete material
   - Filter by universe

3. **Content Discovery (Sales)**
   - Search for materials
   - Filter by type/universe
   - Download material

4. **Persona Management**
   - Create persona
   - Edit persona
   - Delete persona

### 5.3 Example E2E Test

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can login', async ({ page }) => {
    await page.goto('http://localhost:3003')
    
    await page.fill('input[type="email"]', 'admin@ovhcloud.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('http://localhost:3003/')
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })
})
```

---

## 6. Test Configuration

### 6.1 Backend (pytest)

**File:** `backend/pytest.ini`

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    -v
    --strict-markers
    --tb=short
    --cov=app
    --cov-report=term-missing
    --cov-report=html
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow running tests
```

### 6.2 Frontend (Vitest)

**File:** `frontend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

---

## 7. Test Data Management

### 7.1 Test Database

- Use separate test database: `sales_enablement_test`
- Reset before each test run
- Use fixtures for consistent data

### 7.2 Mock Data

**Location:** `backend/tests/fixtures/`

```python
# backend/tests/fixtures/materials.py
SAMPLE_MATERIAL = {
    "name": "Test Sales Deck",
    "material_type": "sales_deck",
    "audience": "customer_facing",
    "universe_name": "Public Cloud",
    "status": "published"
}
```

---

## 8. Continuous Integration

### 8.1 GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-cov
          pytest --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: |
          cd frontend
          npm ci
          npm run test
```

---

## 9. Running Tests

### 9.1 Backend

```bash
# Run all tests
cd backend
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_security.py

# Run specific test
pytest tests/unit/test_security.py::test_password_hashing
```

### 9.2 Frontend

```bash
# Run all tests
cd frontend
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### 9.3 E2E

```bash
# Run E2E tests
npm run test:e2e

# Run in UI mode
npm run test:e2e:ui
```

---

## 10. Test Checklist

Before considering a feature "done":

- [ ] Unit tests written for business logic
- [ ] Integration tests for API endpoints
- [ ] Frontend component tests
- [ ] Error cases tested
- [ ] Edge cases considered
- [ ] Tests pass locally
- [ ] Tests pass in CI
- [ ] Coverage meets target

---

## 11. Best Practices

### Do ✅

- Write tests that are easy to read
- Test behavior, not implementation
- Use descriptive test names
- Keep tests independent
- Use fixtures for common setup
- Mock external dependencies

### Don't ❌

- Test implementation details
- Write flaky tests
- Skip tests without reason
- Test third-party libraries
- Write tests that depend on each other
- Ignore failing tests

---

*This testing strategy should evolve as the application grows.*
