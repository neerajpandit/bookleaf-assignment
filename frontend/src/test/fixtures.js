export const mockBooks = [
  {
    bookId: 'BK001',
    title: 'Whispers of the Ganges',
    isbn: '978-93-5XXXX-01-1',
    genre: 'Literary Fiction',
    publicationDate: '2023-06-20',
    status: 'Published & Live',
    mrp: 399,
    authorRoyaltyPerCopy: 35,
    totalCopiesSold: 342,
    totalRoyaltyEarned: 11970,
    royaltyPaid: 8400,
    royaltyPending: 3570,
    lastRoyaltyPayoutDate: '2025-10-15',
    printPartner: 'In-House',
    availableOn: ['Amazon India'],
  },
  {
    bookId: 'BK002',
    title: 'The Saffron Diaries',
    isbn: null,
    genre: 'Non-Fiction / Memoir',
    publicationDate: null,
    status: 'In Production - Cover Design',
    mrp: null,
    authorRoyaltyPerCopy: null,
    totalCopiesSold: 0,
    totalRoyaltyEarned: 0,
    royaltyPaid: 0,
    royaltyPending: 0,
    lastRoyaltyPayoutDate: null,
    printPartner: null,
    availableOn: [],
  },
];

export const mockTicket = {
  id: '507f1f77bcf86cd799439011',
  ticketNumber: 'TKT-1001',
  subject: 'Royalty payout question',
  description: 'When will my pending royalties be processed?',
  status: 'OPEN',
  category: 'Royalty & Payments',
  priority: 'MEDIUM',
  book: { bookId: 'BK001', title: 'Whispers of the Ganges' },
  lastMessageAt: '2025-10-17T10:00:00.000Z',
  createdAt: '2025-10-17T09:00:00.000Z',
  updatedAt: '2025-10-17T10:00:00.000Z',
};

export const mockTicketDetail = {
  ...mockTicket,
  messages: [
    {
      id: 'msg-1',
      body: 'When will my pending royalties be processed?',
      senderRole: 'AUTHOR',
      senderName: 'Test Author',
      createdAt: '2025-10-17T09:00:00.000Z',
    },
    {
      id: 'msg-2',
      body: 'We are reviewing your payout schedule.',
      senderRole: 'ADMIN',
      senderName: 'Support Admin',
      createdAt: '2025-10-17T10:00:00.000Z',
    },
  ],
};

export const mockClosedTicketDetail = {
  ...mockTicketDetail,
  status: 'CLOSED',
};

export const mockAdminUser = {
  id: '507f1f77bcf86cd799439099',
  email: 'admin@bookleaf.test',
  role: 'ADMIN',
  name: 'Test Admin',
  isActive: true,
};

export const mockAdminTicket = {
  id: '507f1f77bcf86cd799439011',
  ticketNumber: 'TKT-5001',
  subject: 'Royalty payout question',
  description: 'When will my pending royalties be processed?',
  status: 'OPEN',
  category: 'Royalty & Payments',
  priority: 'HIGH',
  aiCategory: 'Royalty & Payments',
  aiPriority: 'MEDIUM',
  author: {
    id: 'author-id-1',
    name: 'Test Author',
    email: 'author@bookleaf.test',
    authorId: 'AUTH001',
  },
  book: { bookId: 'BK001', title: 'Whispers of the Ganges' },
  assignedAdmin: null,
  lastMessageAt: '2025-10-17T10:00:00.000Z',
  createdAt: '2025-10-17T09:00:00.000Z',
  updatedAt: '2025-10-17T10:00:00.000Z',
};

export const mockAdminTicketDetail = {
  ...mockAdminTicket,
  aiProcessingStatus: 'COMPLETED',
  aiDraftResponse: 'We will process your payout within 5 business days.',
  aiPriorityRationale: 'Pending royalties above threshold.',
  aiKnowledgeBaseReferences: ['royalty-payout'],
  aiNeedsHumanReview: false,
  aiProvider: 'openai',
  aiModel: 'gpt-4o-mini',
  aiProcessedAt: '2025-10-17T09:30:00.000Z',
  aiError: null,
  aiConfigured: true,
};

export const mockAdminInternalNote = {
  id: 'note-1',
  body: 'Private admin note for team only',
  admin: { id: mockAdminUser.id, name: 'Test Admin', email: 'admin@bookleaf.test' },
  createdAt: '2025-10-17T10:30:00.000Z',
};

/** Fields that must never appear in author-facing ticket UI */
export const forbiddenTicketFields = {
  aiDraftResponse: 'AI suggested reply',
  aiError: 'Provider timeout',
  privateNote: 'Private admin note',
  internalNotes: [{ body: 'secret' }],
};
