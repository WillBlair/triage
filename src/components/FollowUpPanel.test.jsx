import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import FollowUpPanel from './FollowUpPanel'

// ── Supabase mock ──────────────────────────────────────────────────────────

// Capture the realtime callback so tests can fire it manually
let capturedRealtimeCallback = null

const mockChannel = {
  on: vi.fn().mockImplementation(function (_event, _filter, cb) {
    // Store the last callback registered (checkin_responses or prescriptions)
    if (_filter?.table === 'checkin_responses') capturedRealtimeCallback = cb
    return this
  }),
  subscribe: vi.fn().mockReturnThis(),
}

// mockOrder is the final awaitable in the prescriptions query chain:
//   supabase.from('prescriptions').select(...).order(...) → Promise
const mockOrder = vi.fn()
const mockSelect = vi.fn(() => ({ order: mockOrder }))

const mockSupabase = {
  from: vi.fn((table) => {
    if (table === 'checkin_responses') {
      return {
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      }
    }
    // 'prescriptions'
    return { select: mockSelect }
  }),
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
}

vi.mock('../services/supabase', () => ({
  get supabase() {
    return mockSupabase
  },
}))

// ── Fixtures ───────────────────────────────────────────────────────────────

const BASE_PRESCRIPTION = {
  id: 'rx-001',
  patient_email: 'alice@example.com',
  medication_name: 'Atenolol 50mg',
  prescribed_at: '2025-03-20T10:00:00Z',
  checked_in: false,
  checkin_responses: [],
}

const COMPLETED_PRESCRIPTION = {
  id: 'rx-002',
  patient_email: 'bob@example.com',
  medication_name: 'Lisinopril 10mg',
  prescribed_at: '2025-03-19T09:00:00Z',
  checked_in: true,
  checkin_responses: [
    {
      id: 'cr-001',
      symptoms_selected: ['fatigue', 'headache'],
      free_text_response: 'Feeling a bit tired but otherwise okay.',
      emergency_flagged: false,
      completed_at: '2025-03-20T11:00:00Z',
      conversation_summary: null,
    },
  ],
}

const FLAGGED_PRESCRIPTION = {
  id: 'rx-003',
  patient_email: 'carol@example.com',
  medication_name: 'Amlodipine 5mg',
  prescribed_at: '2025-03-18T08:00:00Z',
  checked_in: true,
  checkin_responses: [
    {
      id: 'cr-002',
      symptoms_selected: ['nausea', 'dizziness', 'fatigue'],
      free_text_response: 'Severe chest pain since yesterday.',
      emergency_flagged: true,
      completed_at: '2025-03-19T10:00:00Z',
      conversation_summary: 'Patient reports severe chest pain with three concurrent symptoms.',
    },
  ],
}

// Helper: set what from('prescriptions').select(...).order(...) resolves to
function mockPrescriptions(rows) {
  mockOrder.mockResolvedValue({ data: rows, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  capturedRealtimeCallback = null
  // Re-attach chainable mocks after clearAllMocks
  mockSelect.mockImplementation(() => ({ order: mockOrder }))
  mockChannel.on.mockImplementation(function (_event, _filter, cb) {
    if (_filter?.table === 'checkin_responses') capturedRealtimeCallback = cb
    return this
  })
  mockChannel.subscribe.mockReturnThis()
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('FollowUpPanel — patient list', () => {
  it('shows all dispatched patients', async () => {
    mockPrescriptions([BASE_PRESCRIPTION, COMPLETED_PRESCRIPTION, FLAGGED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
      expect(screen.getByText('carol@example.com')).toBeInTheDocument()
    })
  })

  it('shows correct status badges', async () => {
    mockPrescriptions([BASE_PRESCRIPTION, COMPLETED_PRESCRIPTION, FLAGGED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })

    const badges = screen.getAllByText(/Pending|Completed|Flagged/)
    const texts = badges.map((b) => b.textContent)
    expect(texts).toContain('Pending')
    expect(texts).toContain('Completed')
    expect(texts).toContain('Flagged')
  })

  it('renders metric cards with correct counts', async () => {
    mockPrescriptions([BASE_PRESCRIPTION, COMPLETED_PRESCRIPTION, FLAGGED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => {
      // Total sent = 3, completed = 2 (checked_in), flagged = 1
      const cards = screen.getAllByRole('paragraph').filter((el) =>
        ['3', '2', '1'].includes(el.textContent),
      )
      expect(cards.length).toBeGreaterThanOrEqual(3)
    })
  })

  it('shows empty state when no prescriptions exist', async () => {
    mockPrescriptions([])
    render(<FollowUpPanel />)

    await waitFor(() => {
      expect(screen.getByText('No check-ins dispatched yet.')).toBeInTheDocument()
    })
  })

  it('filters patients by email search', async () => {
    mockPrescriptions([BASE_PRESCRIPTION, COMPLETED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('Search patients…'), {
      target: { value: 'bob' },
    })

    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })
})

describe('FollowUpPanel — live updates', () => {
  it('refreshes the list when a new checkin_response arrives via Realtime', async () => {
    // Initially one pending prescription
    mockPrescriptions([BASE_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    // Simulate a new completed response arriving — update the mock data
    mockPrescriptions([{ ...BASE_PRESCRIPTION, checked_in: true, checkin_responses: [COMPLETED_PRESCRIPTION.checkin_responses[0]] }])

    // Fire the realtime callback (simulates a Supabase INSERT event)
    await act(async () => {
      capturedRealtimeCallback?.({ eventType: 'INSERT', new: { id: 'cr-999' } })
    })

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  it('subscribes to checkin_responses changes on mount', async () => {
    mockPrescriptions([])
    render(<FollowUpPanel />)

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('follow-up-realtime')
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ table: 'checkin_responses' }),
        expect.any(Function),
      )
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })
  })

  it('unsubscribes on unmount', async () => {
    mockPrescriptions([])
    const { unmount } = render(<FollowUpPanel />)

    await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled())

    unmount()
    expect(mockSupabase.removeChannel).toHaveBeenCalled()
  })
})

describe('FollowUpPanel — detail panel', () => {
  it('shows empty state until a patient is selected', async () => {
    mockPrescriptions([COMPLETED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument())
    expect(screen.getByText('Select a patient')).toBeInTheDocument()
  })

  it('shows symptom pills and free text when a patient is selected', async () => {
    mockPrescriptions([COMPLETED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument())
    fireEvent.click(screen.getByText('bob@example.com'))

    await waitFor(() => {
      expect(screen.getByText('Fatigue or low energy')).toBeInTheDocument()
      expect(screen.getByText('Headache')).toBeInTheDocument()
      expect(screen.getByText('Feeling a bit tired but otherwise okay.')).toBeInTheDocument()
    })
  })

  it('shows emergency alert for flagged patients', async () => {
    mockPrescriptions([FLAGGED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => expect(screen.getByText('carol@example.com')).toBeInTheDocument())
    fireEvent.click(screen.getByText('carol@example.com'))

    await waitFor(() => {
      expect(screen.getByText('Emergency flag raised')).toBeInTheDocument()
    })
  })
})

describe('FollowUpPanel — conversation modal', () => {
  it('opens modal when "View full response" button is clicked', async () => {
    mockPrescriptions([COMPLETED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument())
    fireEvent.click(screen.getByText('bob@example.com'))

    await waitFor(() =>
      expect(screen.getByText('View full response & AI summary')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByText('View full response & AI summary'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Check-in response')).toBeInTheDocument()
    })
  })

  it('displays symptoms, patient message, and medication inside modal', async () => {
    mockPrescriptions([COMPLETED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument())
    fireEvent.click(screen.getByText('bob@example.com'))
    await waitFor(() => screen.getByText('View full response & AI summary'))
    fireEvent.click(screen.getByText('View full response & AI summary'))

    await waitFor(() => {
      // medication name appears in list, detail panel, and modal — use getAllByText
      expect(screen.getAllByText('Lisinopril 10mg').length).toBeGreaterThanOrEqual(1)
      // symptoms appear as pills inside modal
      expect(screen.getAllByText('Fatigue or low energy').length).toBeGreaterThanOrEqual(1)
      // patient message as chat bubble
      expect(screen.getAllByText('Feeling a bit tired but otherwise okay.').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows existing AI summary when present', async () => {
    mockPrescriptions([FLAGGED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => expect(screen.getByText('carol@example.com')).toBeInTheDocument())
    fireEvent.click(screen.getByText('carol@example.com'))
    await waitFor(() => screen.getByText('View full response & AI summary'))
    fireEvent.click(screen.getByText('View full response & AI summary'))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Patient reports severe chest pain with three concurrent symptoms.',
        ),
      ).toBeInTheDocument()
      // "Generate summary" button should NOT appear when summary already exists
      expect(screen.queryByText('Generate summary')).not.toBeInTheDocument()
    })
  })

  it('shows "Generate summary" button when no summary exists', async () => {
    mockPrescriptions([COMPLETED_PRESCRIPTION]) // summary: null
    render(<FollowUpPanel />)

    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument())
    fireEvent.click(screen.getByText('bob@example.com'))
    await waitFor(() => screen.getByText('View full response & AI summary'))
    fireEvent.click(screen.getByText('View full response & AI summary'))

    await waitFor(() => {
      expect(screen.getByText('Generate summary')).toBeInTheDocument()
    })
  })

  it('closes modal on Escape key', async () => {
    mockPrescriptions([COMPLETED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument())
    fireEvent.click(screen.getByText('bob@example.com'))
    await waitFor(() => screen.getByText('View full response & AI summary'))
    fireEvent.click(screen.getByText('View full response & AI summary'))

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes modal on Close button click', async () => {
    mockPrescriptions([COMPLETED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument())
    fireEvent.click(screen.getByText('bob@example.com'))
    await waitFor(() => screen.getByText('View full response & AI summary'))
    fireEvent.click(screen.getByText('View full response & AI summary'))

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /close modal/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('shows emergency flag inside modal for flagged patients', async () => {
    mockPrescriptions([FLAGGED_PRESCRIPTION])
    render(<FollowUpPanel />)

    await waitFor(() => expect(screen.getByText('carol@example.com')).toBeInTheDocument())
    fireEvent.click(screen.getByText('carol@example.com'))
    await waitFor(() => screen.getByText('View full response & AI summary'))
    fireEvent.click(screen.getByText('View full response & AI summary'))

    await waitFor(() => {
      const flags = screen.getAllByText('Emergency flag raised')
      expect(flags.length).toBeGreaterThanOrEqual(1)
    })
  })
})
