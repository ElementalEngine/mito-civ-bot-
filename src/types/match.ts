export type MatchStatus = 'pending' | 'edited' | 'flagged' | 'approved' | 'rejected'

export interface Player {
  userId?: string           // Discord user ID (optional if not linked yet)
  civ: string               // Civilization name (e.g., "Rome")
  leader: string            // Leader name (e.g., "Trajan")
  placement?: number        // Final placement (1 = winner)
  quit?: boolean            // Flagged as quitter
  subbedInFor?: string      // If this player is a substitute for another
}

export interface Match {
  _id: string               // UUID or ObjectId — match ID
  uploaderId: string        // Discord user ID of the uploader
  createdAt: Date
  parsedAt: Date

  turn: number
  map: string
  gameType: 'ffa' | 'team' | 'duel'
  players: Player[]

  // Status and approval metadata
  status: MatchStatus
  approvedAt?: Date
  approvedBy?: string
  rejectedAt?: Date
  rejectedBy?: string

  // audit log ???? IDEA
  editHistory?: {
    editedAt: Date
    editedBy: string
    action: string
    field?: string
    before?: any
    after?: any
  }[]
}