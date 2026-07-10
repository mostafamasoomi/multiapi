/**
 * SSE streaming utility library for MultiAPI chat.
 *
 * Provides a robust async-iterable stream over SSE (Server-Sent Events)
 * with automatic reconnection via exponential backoff.
 *
 * @example
 * ```ts
 * const { reader, abort } = streamChat(messages, 'gpt-4o', apiKey);
 * for await (const event of reader) {
 *   if (event.type === 'token') console.log(event.data);
 *   else if (event.type === 'done') console.log('Stream complete');
 *   else if (event.type === 'error') console.error(event.data);
 * }
 * ```
 */

/* ------------------------------------------------------------------ */
/*  Shared types (re-exported for convenience)                        */
/* ------------------------------------------------------------------ */

/** A message sent to or received from the chat API. */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** A single SSE event emitted by the stream. */
export type StreamEvent =
  | { type: 'token'; data: string }
  | { type: 'done'; data: string }
  | { type: 'error'; data: string };

/** Options for streamChat(). */
export interface StreamOptions {
  /** Custom signal for external cancellation (merged with internal). */
  signal?: AbortSignal;
  /** API base URL (defaults to "" — same origin). */
  apiBase?: string;
  /** Maximum number of reconnection attempts (default: 3). */
  maxRetries?: number;
  /** Initial backoff delay in milliseconds (default: 500). */
  initialBackoffMs?: number;
  /** Backoff multiplier (default: 2). */
  backoffMultiplier?: number;
  /** Additional request body fields merged with { messages, model, stream: true }. */
  extraBody?: Record<string, unknown>;
  /** Custom fetch implementation (useful for testing or Node.js environments). */
  fetchImpl?: typeof fetch;
}

/** The return value of streamChat(). */
export interface StreamResult {
  /** Async iterable of StreamEvents. */
  reader: AsyncIterable<StreamEvent>;
  /** Abort the stream immediately. */
  abort: () => void;
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Parse a raw SSE string into one or more StreamEvents.
 * Handles the standard SSE format: `data: {...}\n\n`
 */
function parseSSEChunk(chunk: string): StreamEvent[] {
  const events: StreamEvent[] = [];
  const parts = chunk.split('\n\n');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Extract all `data:` lines
    const lines = trimmed.split('\n');
    const dataLines: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('data:')) {
        dataLines.push(t.slice(5).trim());
      }
    }
    if (dataLines.length === 0) continue;

    const payload = dataLines.join('\n');

    // [DONE] sentinel
    if (payload === '[DONE]') {
      events.push({ type: 'done', data: '' });
      continue;
    }

    // Try to parse JSON
    try {
      const parsed = JSON.parse(payload);

      // Check for API-level error
      if (parsed.error) {
        events.push({ type: 'error', data: typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error) });
        continue;
      }

      // Extract delta content (OpenAI-compatible format)
      const content = parsed.choices?.[0]?.delta?.content;
      if (content !== undefined && content !== null && content !== '') {
        events.push({ type: 'token', data: content });
      }

      // Check for finish_reason
      const finishReason = parsed.choices?.[0]?.finish_reason;
      if (finishReason) {
        events.push({ type: 'done', data: finishReason });
      }
    } catch {
      // Non-JSON payload — treat as a raw token (some providers send plain text)
      if (payload) {
        events.push({ type: 'token', data: payload });
      }
    }
  }
  return events;
}

/**
 * Calculate backoff delay for the given attempt number.
 */
function backoffDelay(attempt: number, initialMs: number, multiplier: number): number {
  return initialMs * Math.pow(multiplier, attempt);
}

/* ------------------------------------------------------------------ */
/*  Main stream function                                               */
/* ------------------------------------------------------------------ */

export function streamChat(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  options: StreamOptions = {},
): StreamResult {
  const {
    signal: externalSignal,
    apiBase = '',
    maxRetries = 3,
    initialBackoffMs = 500,
    backoffMultiplier = 2,
    extraBody = {},
    fetchImpl = fetch,
  } = options;

  const internalController = new AbortController();

  // Merge external and internal signals
  // When the internal controller aborts, we fire the internal signal.
  // When the external signal fires, we also abort the internal controller.
  if (externalSignal) {
    if (externalSignal.aborted) {
      internalController.abort();
    } else {
      externalSignal.addEventListener('abort', () => internalController.abort(), { once: true });
    }
  }

  const abort = () => internalController.abort();

  const url = `${apiBase}/api/chat`;

  async function* streamGenerator(): AsyncGenerator<StreamEvent> {
    let attempt = 0;

    while (attempt <= maxRetries) {
      // If aborted before we even start, bail out
      if (internalController.signal.aborted) {
        return;
      }

      try {
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            messages,
            model,
            stream: true,
            ...extraBody,
          }),
          signal: internalController.signal,
        });

        if (!response.ok) {
          let errorBody: string;
          try {
            const errJson = await response.json();
            errorBody = errJson.error || JSON.stringify(errJson);
          } catch {
            errorBody = `HTTP ${response.status} ${response.statusText}`;
          }
          throw new Error(errorBody);
        }

        if (!response.body) {
          throw new Error('Response body is null — streaming not supported');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Reset attempt counter on successful connection
        attempt = 0;

        while (true) {
          if (internalController.signal.aborted) {
            reader.cancel();
            return;
          }

          let result: ReadableStreamReadResult<Uint8Array>;
          try {
            result = await reader.read();
          } catch (err: unknown) {
            // If the reader was cancelled, just exit cleanly
            if (err instanceof DOMException && err.name === 'AbortError') {
              return;
            }
            throw err;
          }

          if (result.done) {
            // Flush remaining buffer
            if (buffer.trim()) {
              const events = parseSSEChunk(buffer);
              for (const event of events) {
                yield event;
              }
            }
            // If we got done from the reader but no explicit [DONE] event,
            // emit a synthetic done event.
            yield { type: 'done', data: '' };
            return;
          }

          buffer += decoder.decode(result.value, { stream: true });

          // Process complete SSE frames (delimited by \n\n)
          const frames = buffer.split('\n\n');
          // The last element may be incomplete — keep it in the buffer
          buffer = frames.pop() || '';

          for (const frame of frames) {
            // Reconstruct the frame with its terminating \n\n for parsing
            const events = parseSSEChunk(frame + '\n\n');
            for (const event of events) {
              yield event;
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        const message = err instanceof Error ? err.message : String(err);

        attempt++;

        if (attempt > maxRetries) {
          yield { type: 'error', data: `Stream failed after ${maxRetries + 1} attempts: ${message}` };
          return;
        }

        // Yield a non-fatal error so the consumer knows about the retry
        yield { type: 'error', data: `Connection lost (attempt ${attempt}/${maxRetries + 1}), retrying...` };

        // Wait with exponential backoff before retrying
        const delay = backoffDelay(attempt - 1, initialBackoffMs, backoffMultiplier);
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, delay);
          const onAbort = () => {
            clearTimeout(timeout);
            resolve();
          };
          internalController.signal.addEventListener('abort', onAbort, { once: true });
        });

        if (internalController.signal.aborted) {
          return;
        }
      }
    }
  }

  return {
    reader: streamGenerator(),
    abort,
  };
}