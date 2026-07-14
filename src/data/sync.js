import { getState, dispatch, subscribe } from './store.js'

let isSyncing = false

export async function syncOutbox() {
  if (isSyncing) return
  if (!navigator.onLine) return

  const state = getState()
  if (!state.outbox || state.outbox.length === 0) return

  isSyncing = true
  console.log(`[Sync] Outbox has ${state.outbox.length} pending operations. Syncing via REST API...`)

  try {
    while (navigator.onLine) {
      const freshState = getState()
      const outbox = freshState.outbox
      if (!outbox || outbox.length === 0) break

      // Sync in batches of 20 operations to optimize network load
      const batch = outbox.slice(0, 20)
      console.log(`[Sync] Dispatching batch of ${batch.length} operations to REST API...`)

      try {
        const response = await fetch('http://localhost:3000/api/ops', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ops: batch })
        })

        if (!response.ok) {
          throw new Error(`Sync server responded with status: ${response.status}`)
        }

        const data = await response.json()
        const { processedOpIds } = data

        if (processedOpIds && processedOpIds.length > 0) {
          console.log(`[Sync] Successfully synced ${processedOpIds.length} operations. Clearing local outbox.`)
          for (const opId of processedOpIds) {
            dispatch({ type: 'clearOutboxItem', opId })
          }
        } else {
          // Prevent infinite loops if server reports zero processed items
          break
        }
      } catch (err) {
        console.error('[Sync] REST API connection failed:', err)
        break // Halt loop on network error, will trigger again next online/dispatch event
      }
    }
  } finally {
    isSyncing = false
    console.log('[Sync] Sync process ended.')
  }
}

// Initialize sync listeners
export function initSync() {
  window.addEventListener('online', syncOutbox)

  // Listen to store updates to sync immediately if online
  subscribe(() => {
    if (navigator.onLine) {
      syncOutbox()
    }
  })

  // Fallback timer polling sync loop
  setInterval(() => {
    if (navigator.onLine) {
      syncOutbox()
    }
  }, 25000)

  // Bootstrap immediate check
  if (navigator.onLine) {
    syncOutbox()
  }
}
