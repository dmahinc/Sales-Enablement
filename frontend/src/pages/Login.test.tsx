import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Login from './Login'
import { useAuth } from '../contexts/AuthContext'

// Mock the auth context
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Login', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      logout: vi.fn(),
      user: null,
      loading: false,
    } as any)
  })

  it('renders login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('allows user to enter email and password', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    await user.type(emailInput, 'test@ovhcloud.com')
    await user.type(passwordInput, 'password123')
    
    expect(emailInput).toHaveValue('test@ovhcloud.com')
    expect(passwordInput).toHaveValue('password123')
  })

  it('shows error message on login failure', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new Error('Login failed'))
    
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@ovhcloud.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    const user = userEvent.setup()
    mockLogin.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@ovhcloud.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })
})
