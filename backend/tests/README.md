# Backend Tests

This directory contains all backend tests for the Sales Enablement Platform.

## Structure

```
tests/
├── __init__.py
├── conftest.py              # Pytest fixtures and configuration
├── unit/                    # Unit tests
│   └── test_security.py
└── integration/             # Integration tests
    ├── test_auth.py
    └── test_materials.py
```

## Running Tests

### Prerequisites

1. Install test dependencies:
```bash
pip install -r requirements.txt
```

2. Create test database:
```bash
createdb sales_enablement_test
```

### Run All Tests

```bash
cd backend
pytest
```

### Run with Coverage

```bash
pytest --cov=app --cov-report=html
```

Coverage report will be generated in `htmlcov/index.html`

### Run Specific Test File

```bash
pytest tests/unit/test_security.py
```

### Run Specific Test

```bash
pytest tests/unit/test_security.py::test_password_hashing
```

### Run by Marker

```bash
# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Skip slow tests
pytest -m "not slow"
```

## Test Database

Tests use a separate database: `sales_enablement_test`

The test database is automatically created and dropped for each test run.

## Writing Tests

### Unit Test Example

```python
def test_function_name():
    """Test description."""
    # Arrange
    input_value = "test"
    
    # Act
    result = function_to_test(input_value)
    
    # Assert
    assert result == expected_value
```

### Integration Test Example

```python
def test_endpoint_name(client, auth_headers):
    """Test endpoint description."""
    response = client.get(
        "/api/endpoint",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    assert "expected_field" in response.json()
```

## Fixtures

Common fixtures available in `conftest.py`:

- `client` - FastAPI test client
- `db` - Database session
- `test_user` - Sample user for testing
- `auth_headers` - Authentication headers

## Best Practices

1. **Test one thing** - Each test should verify one behavior
2. **Descriptive names** - Test names should describe what they test
3. **Arrange-Act-Assert** - Structure tests clearly
4. **Use fixtures** - Don't duplicate setup code
5. **Clean up** - Tests should not leave data behind
