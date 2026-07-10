/**
 * Shared types for MultiAPI chat.
 */

/** A single chat message. */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** ISO-8601 timestamp (e.g. new Date().toISOString()). */
  timestamp: string;
  /** Optional cost in Iranian Rial (IRR). */
  cost_irr?: number;
}

/** A conversation (chat session). */
export interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  /** ISO-8601 timestamp. */
  createdAt: string;
  /** ISO-8601 timestamp. */
  updatedAt: string;
}

/** Information about an available model. */
export interface ModelInfo {
  /** Short identifier used in API calls (e.g. "gpt-4o"). */
  alias: string;
  /** Tier / category (e.g. "premium", "free"). */
  tier: string;
  /** Human-readable display name. */
  display_name: string;
  /** List of capabilities (e.g. ["chat", "vision", "tools"]). */
  capabilities: string[];
  /** Maximum context window size in tokens. */
  context_window: number;
  /** Price per input token in IRR. */
  input_price: number;
  /** Price per output token in IRR. */
  output_price: number;
}