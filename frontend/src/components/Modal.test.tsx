import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )
    
    // Click on backdrop (the overlay div)
    const backdrop = screen.getByText('Test Modal').closest('.fixed')
    if (backdrop) {
      await user.click(backdrop)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('renders with different sizes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Small Modal" size="sm">
        Content
      </Modal>
    )
    
    expect(screen.getByText('Small Modal')).toBeInTheDocument()
    
    rerender(
      <Modal isOpen={true} onClose={vi.fn()} title="Large Modal" size="lg">
        Content
      </Modal>
    )
    
    expect(screen.getByText('Large Modal')).toBeInTheDocument()
  })
})
