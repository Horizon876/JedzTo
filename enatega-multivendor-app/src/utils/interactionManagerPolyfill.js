/**
 * React Native 0.88+ removed InteractionManager from the public API.
 * @react-navigation/stack v6 (and some other libs) still call it during
 * card transitions. Re-attach a minimal compatible shim before those
 * modules load. Prefer requestIdleCallback for deferred work.
 */
const ReactNative = require('react-native')

let nextHandle = 1

const InteractionManager = {
  createInteractionHandle() {
    return nextHandle++
  },
  clearInteractionHandle() {},
  runAfterInteractions(task) {
    const run = () => {
      if (typeof task === 'function') return task()
      if (task && typeof task.run === 'function') return task.run()
    }
    if (typeof globalThis.requestIdleCallback === 'function') {
      const id = globalThis.requestIdleCallback(() => {
        run()
      })
      return {
        cancel: () => {
          if (typeof globalThis.cancelIdleCallback === 'function') {
            globalThis.cancelIdleCallback(id)
          }
        }
      }
    }
    const timeoutId = setTimeout(run, 0)
    return { cancel: () => clearTimeout(timeoutId) }
  }
}

const existing = Object.getOwnPropertyDescriptor(ReactNative, 'InteractionManager')
if (!existing || existing.configurable) {
  try {
    Object.defineProperty(ReactNative, 'InteractionManager', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: InteractionManager
    })
  } catch {
    // Web / RN-web may expose a non-configurable InteractionManager — leave it.
  }
} else if (!ReactNative.InteractionManager?.runAfterInteractions) {
  try {
    ReactNative.InteractionManager = InteractionManager
  } catch {
    /* ignore */
  }
}
