const hiddenConsoleMessages = [
  'Download the React DevTools for a better development experience',
  'SES Removing unpermitted intrinsics',
]

function shouldHideConsoleMessage(args) {
  return args.some((arg) => {
    if (typeof arg !== 'string') {
      return false
    }

    return hiddenConsoleMessages.some((message) => arg.includes(message))
  })
}

export function installDevConsoleFilters() {
  if (!import.meta.env.DEV) {
    return
  }

  ;['debug', 'info', 'log', 'warn'].forEach((method) => {
    const originalMethod = console[method]

    console[method] = (...args) => {
      if (shouldHideConsoleMessage(args)) {
        return
      }

      originalMethod(...args)
    }
  })
}
