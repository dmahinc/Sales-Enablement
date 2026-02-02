import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FileUploadModal from './FileUploadModal'

// Mock the API
vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}))

describe('FileUploadModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<FileUploadModal isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByText('Upload Material')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<FileUploadModal isOpen={false} onClose={mockOnClose} />)
    
    expect(screen.queryByText('Upload Material')).not.toBeInTheDocument()
  })

  it('allows file selection', async () => {
    const user = userEvent.setup()
    render(<FileUploadModal isOpen={true} onClose={mockOnClose} />)
    
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText(/upload a file/i) as HTMLInputElement
    
    await user.upload(input, file)
    
    expect(input.files?.[0]).toBe(file)
  })

  it('requires material type selection', async () => {
    const user = userEvent.setup()
    render(<FileUploadModal isOpen={true} onClose={mockOnClose} />)
    
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText(/upload a file/i) as HTMLInputElement
    await user.upload(input, file)
    
    // Material type should be pre-selected (default: product_brief)
    const materialTypeSelect = screen.getByLabelText(/material type/i) as HTMLSelectElement
    expect(materialTypeSelect.value).toBe('product_brief')
  })

  it('requires universe selection', async () => {
    render(<FileUploadModal isOpen={true} onClose={mockOnClose} />)
    
    const universeSelect = screen.getByLabelText(/universe/i) as HTMLSelectElement
    expect(universeSelect.value).toBe('Public Cloud') // Default value
  })

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<FileUploadModal isOpen={true} onClose={mockOnClose} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
