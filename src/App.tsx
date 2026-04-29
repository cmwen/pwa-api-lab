import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

type SupportStatus = 'supported' | 'partial' | 'unsupported'

type ConnectionInfo = {
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void
  effectiveType?: string
  downlink?: number
  removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void
  rtt?: number
  saveData?: boolean
  type?: string
}

type RelatedApplicationInfo = {
  id?: string
  platform: string
  url?: string
  version?: string
}

type NavigatorWithExtras = Navigator & {
  standalone?: boolean
  setAppBadge?: (contents?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
  connection?: ConnectionInfo
  mozConnection?: ConnectionInfo
  webkitConnection?: ConnectionInfo
  getInstalledRelatedApps?: () => Promise<RelatedApplicationInfo[]>
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>
  }
}

type ServiceWorkerRegistrationWithExtras = ServiceWorkerRegistration & {
  sync?: {
    register: (tag: string) => Promise<void>
    getTags?: () => Promise<string[]>
  }
  periodicSync?: {
    register: (tag: string, options: { minInterval: number }) => Promise<void>
    getTags?: () => Promise<string[]>
  }
}

type BeforeInstallPromptEvent = Event & {
  platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

type LaunchQueueWithExtras = {
  setConsumer: (consumer: (launchParams: { files?: readonly unknown[] }) => void) => void
}

type Snapshot = {
  badgeSupported: boolean
  backgroundSyncSupported: boolean
  cacheStorageSupported: boolean
  canShareUrl: boolean
  connection: ConnectionInfo | null
  displayMode: string
  fileSystemAccessSupported: boolean
  installOutcome: string
  installPromptAvailable: boolean
  installed: boolean
  launchedFiles: number
  launchQueueSupported: boolean
  lastUpdated: string
  manifestLinked: boolean
  notes: string[]
  notificationPermission: NotificationPermission | 'unsupported'
  online: boolean
  orientationAngle: number | null
  orientationLockSupported: boolean
  orientationType: string
  periodicSyncSupported: boolean
  persistedStorage: boolean | null
  persistentStorageSupported: boolean
  protocolHandlerSupported: boolean
  pushSupported: boolean
  relatedAppsCount: number | null
  relatedAppsSupported: boolean
  secureContext: boolean
  serviceWorkerControlled: boolean
  serviceWorkerState: string
  serviceWorkerSupported: boolean
  shareSupported: boolean
  standaloneIos: boolean
  storageQuota: number | null
  storageUsage: number | null
  vibrationSupported: boolean
  wakeLockActive: boolean
  wakeLockSupported: boolean
}

type CapabilityCard = {
  details: string[]
  summary: string
  title: string
  status: SupportStatus
}

const BASE_ASSET_URL = `${import.meta.env.BASE_URL}app-icon.svg`
const NOT_AVAILABLE = 'Not available'

const INITIAL_SNAPSHOT: Snapshot = {
  badgeSupported: false,
  backgroundSyncSupported: false,
  cacheStorageSupported: false,
  canShareUrl: false,
  connection: null,
  displayMode: 'Loading',
  fileSystemAccessSupported: false,
  installOutcome: 'Not attempted',
  installPromptAvailable: false,
  installed: false,
  launchedFiles: 0,
  launchQueueSupported: false,
  lastUpdated: '',
  manifestLinked: false,
  notes: [],
  notificationPermission: 'default',
  online: navigator.onLine,
  orientationAngle: null,
  orientationLockSupported: false,
  orientationType: NOT_AVAILABLE,
  periodicSyncSupported: false,
  persistedStorage: null,
  persistentStorageSupported: false,
  protocolHandlerSupported: false,
  pushSupported: false,
  relatedAppsCount: null,
  relatedAppsSupported: false,
  secureContext: window.isSecureContext,
  serviceWorkerControlled: false,
  serviceWorkerState: 'Checking',
  serviceWorkerSupported: 'serviceWorker' in navigator,
  shareSupported: false,
  standaloneIos: false,
  storageQuota: null,
  storageUsage: null,
  vibrationSupported: false,
  wakeLockActive: false,
  wakeLockSupported: false,
}

function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(INITIAL_SNAPSHOT)
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [wakeLockSentinel, setWakeLockSentinel] = useState<WakeLockSentinel | null>(null)
  const [eventLog, setEventLog] = useState<string[]>([
    `${formatTime()} Ready to test this browser's PWA support.`,
  ])
  const [installOutcome, setInstallOutcome] = useState('Not attempted')
  const [launchedFiles, setLaunchedFiles] = useState(0)

  const addLog = useCallback((message: string) => {
    setEventLog((current) => [`${formatTime()} ${message}`, ...current].slice(0, 10))
  }, [])

  const refreshSnapshot = useCallback(async () => {
    const nav = navigator as NavigatorWithExtras
    const diagnostics: string[] = []
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null
    const standaloneIos = Boolean(nav.standalone)

    let registration: ServiceWorkerRegistrationWithExtras | undefined
    if ('serviceWorker' in navigator) {
      try {
        registration =
          (await navigator.serviceWorker.getRegistration()) as
            | ServiceWorkerRegistrationWithExtras
            | undefined
      } catch (error) {
        diagnostics.push(`Service worker registration: ${formatError(error)}`)
      }
    }

    let persistedStorage: boolean | null = null
    let storageQuota: number | null = null
    let storageUsage: number | null = null
    if (navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        storageQuota = estimate.quota ?? null
        storageUsage = estimate.usage ?? null
      } catch (error) {
        diagnostics.push(`Storage estimate: ${formatError(error)}`)
      }
    }

    if (navigator.storage?.persisted) {
      try {
        persistedStorage = await navigator.storage.persisted()
      } catch (error) {
        diagnostics.push(`Persistent storage status: ${formatError(error)}`)
      }
    }

    let relatedAppsCount: number | null = null
    if (nav.getInstalledRelatedApps) {
      try {
        relatedAppsCount = (await nav.getInstalledRelatedApps()).length
      } catch (error) {
        diagnostics.push(`Installed related apps: ${formatError(error)}`)
      }
    }

    const displayModes = ['standalone', 'fullscreen', 'minimal-ui', 'browser']
    const activeDisplayMode =
      displayModes.find((mode) => window.matchMedia(`(display-mode: ${mode})`).matches) ??
      (standaloneIos ? 'standalone (iOS)' : 'browser')

    setSnapshot({
      badgeSupported:
        typeof nav.setAppBadge === 'function' || typeof nav.clearAppBadge === 'function',
      backgroundSyncSupported: Boolean(registration?.sync),
      cacheStorageSupported: 'caches' in window,
      canShareUrl:
        typeof nav.canShare === 'function'
          ? nav.canShare({ title: 'PWA API Lab', url: window.location.href })
          : typeof nav.share === 'function',
      connection: connection
        ? {
            downlink: connection.downlink,
            effectiveType: connection.effectiveType,
            rtt: connection.rtt,
            saveData: connection.saveData,
            type: connection.type,
          }
        : null,
      displayMode: activeDisplayMode,
      fileSystemAccessSupported: 'showOpenFilePicker' in window,
      installOutcome,
      installPromptAvailable: Boolean(installPromptEvent),
      installed: standaloneIos || activeDisplayMode !== 'browser',
      launchedFiles,
      launchQueueSupported: 'launchQueue' in window,
      lastUpdated: new Date().toISOString(),
      manifestLinked: Boolean(document.querySelector("link[rel='manifest']")),
      notes: diagnostics,
      notificationPermission:
        'Notification' in window ? Notification.permission : 'unsupported',
      online: navigator.onLine,
      orientationAngle: screen.orientation?.angle ?? null,
      orientationLockSupported: typeof screen.orientation?.lock === 'function',
      orientationType: screen.orientation?.type ?? NOT_AVAILABLE,
      periodicSyncSupported: Boolean(registration?.periodicSync),
      persistedStorage,
      persistentStorageSupported: Boolean(navigator.storage?.persist),
      protocolHandlerSupported: typeof nav.registerProtocolHandler === 'function',
      pushSupported: 'PushManager' in window,
      relatedAppsCount,
      relatedAppsSupported: typeof nav.getInstalledRelatedApps === 'function',
      secureContext: window.isSecureContext,
      serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
      serviceWorkerState:
        registration?.active?.state ??
        registration?.installing?.state ??
        registration?.waiting?.state ??
        (registration ? 'registered' : 'not registered'),
      serviceWorkerSupported: 'serviceWorker' in navigator,
      shareSupported: typeof nav.share === 'function',
      standaloneIos,
      storageQuota,
      storageUsage,
      vibrationSupported: typeof nav.vibrate === 'function',
      wakeLockActive: Boolean(wakeLockSentinel && !wakeLockSentinel.released),
      wakeLockSupported: typeof nav.wakeLock?.request === 'function',
    })
  }, [installOutcome, installPromptEvent, launchedFiles, wakeLockSentinel])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSnapshot()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [refreshSnapshot])

  useEffect(() => {
    const nav = navigator as NavigatorWithExtras
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection

    const handleRefresh = () => {
      void refreshSnapshot()
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent
      promptEvent.preventDefault()
      setInstallPromptEvent(promptEvent)
      addLog('Install prompt captured and ready for manual testing.')
      void refreshSnapshot()
    }

    const handleAppInstalled = () => {
      setInstallPromptEvent(null)
      setInstallOutcome('Installed')
      addLog('App installed from the browser install flow.')
      void refreshSnapshot()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleRefresh)
    window.addEventListener('offline', handleRefresh)
    window.addEventListener('pwa-offline-ready', handleRefresh)
    window.addEventListener('pwa-update-ready', handleRefresh)
    navigator.serviceWorker?.addEventListener('controllerchange', handleRefresh)
    screen.orientation?.addEventListener('change', handleRefresh)
    document.addEventListener('visibilitychange', handleRefresh)
    connection?.addEventListener?.('change', handleRefresh)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleRefresh)
      window.removeEventListener('offline', handleRefresh)
      window.removeEventListener('pwa-offline-ready', handleRefresh)
      window.removeEventListener('pwa-update-ready', handleRefresh)
      navigator.serviceWorker?.removeEventListener('controllerchange', handleRefresh)
      screen.orientation?.removeEventListener('change', handleRefresh)
      document.removeEventListener('visibilitychange', handleRefresh)
      connection?.removeEventListener?.('change', handleRefresh)
    }
  }, [addLog, refreshSnapshot])

  useEffect(() => {
    if (!wakeLockSentinel) {
      return
    }

    const handleRelease = () => {
      setWakeLockSentinel(null)
      addLog('Wake lock was released.')
      void refreshSnapshot()
    }

    wakeLockSentinel.addEventListener('release', handleRelease)
    return () => {
      wakeLockSentinel.removeEventListener('release', handleRelease)
    }
  }, [addLog, refreshSnapshot, wakeLockSentinel])

  useEffect(() => {
    const launchQueue = (window as Window & { launchQueue?: LaunchQueueWithExtras })
      .launchQueue

    if (!launchQueue) {
      return
    }

    launchQueue.setConsumer((launchParams) => {
      const fileCount = launchParams.files?.length ?? 0
      setLaunchedFiles(fileCount)
      addLog(
        fileCount > 0
          ? `Launch Queue delivered ${fileCount} file${fileCount === 1 ? '' : 's'}.`
          : 'Launch Queue triggered without files.',
      )
      void refreshSnapshot()
    })
  }, [addLog, refreshSnapshot])

  const capabilityCards = useMemo<CapabilityCard[]>(() => {
    const storageSummary =
      snapshot.storageQuota && snapshot.storageUsage
        ? `${formatBytes(snapshot.storageUsage)} of ${formatBytes(snapshot.storageQuota)} used`
        : 'Quota estimate unavailable'

    return [
      {
        title: 'Installability',
        status: snapshot.installPromptAvailable
          ? 'supported'
          : snapshot.serviceWorkerSupported && snapshot.manifestLinked
            ? 'partial'
            : 'unsupported',
        summary: snapshot.installPromptAvailable
          ? 'Install prompt is ready to test.'
          : snapshot.installed
            ? 'Already running in an installed display mode.'
            : 'Manifest and service worker are required before install prompts appear.',
        details: [
          `Manifest linked: ${asYesNo(snapshot.manifestLinked)}`,
          `Display mode: ${snapshot.displayMode}`,
          `Install prompt available: ${asYesNo(snapshot.installPromptAvailable)}`,
          `Last install result: ${snapshot.installOutcome}`,
        ],
      },
      {
        title: 'Service worker',
        status: snapshot.serviceWorkerSupported
          ? snapshot.serviceWorkerControlled
            ? 'supported'
            : 'partial'
          : 'unsupported',
        summary: snapshot.serviceWorkerSupported
          ? 'Offline support and page control can be checked from this browser.'
          : 'This browser does not expose the service worker API.',
        details: [
          `Supported: ${asYesNo(snapshot.serviceWorkerSupported)}`,
          `Controlled page: ${asYesNo(snapshot.serviceWorkerControlled)}`,
          `Registration state: ${snapshot.serviceWorkerState}`,
          `Cache Storage API: ${asYesNo(snapshot.cacheStorageSupported)}`,
        ],
      },
      {
        title: 'Notifications and badging',
        status:
          snapshot.notificationPermission === 'granted' || snapshot.badgeSupported
            ? 'supported'
            : snapshot.notificationPermission !== 'unsupported'
              ? 'partial'
              : 'unsupported',
        summary:
          snapshot.notificationPermission === 'granted'
            ? 'You can send a local test notification immediately.'
            : 'Notification permission and app badging often vary between desktop and mobile.',
        details: [
          `Notification permission: ${snapshot.notificationPermission}`,
          `Badging API: ${asYesNo(snapshot.badgeSupported)}`,
          `Push API: ${asYesNo(snapshot.pushSupported)}`,
          `Secure context: ${asYesNo(snapshot.secureContext)}`,
        ],
      },
      {
        title: 'Sharing and launch',
        status:
          snapshot.shareSupported || snapshot.launchQueueSupported
            ? 'supported'
            : snapshot.fileSystemAccessSupported || snapshot.protocolHandlerSupported
              ? 'partial'
              : 'unsupported',
        summary:
          snapshot.shareSupported || snapshot.launchQueueSupported
            ? 'Share, file launch, and protocol handling can be compared here.'
            : 'These integrations depend heavily on browser and OS support.',
        details: [
          `Web Share API: ${asYesNo(snapshot.shareSupported)}`,
          `Can share URL payloads: ${asYesNo(snapshot.canShareUrl)}`,
          `Launch Queue API: ${asYesNo(snapshot.launchQueueSupported)}`,
          `File System Access API: ${asYesNo(snapshot.fileSystemAccessSupported)}`,
        ],
      },
      {
        title: 'Storage and offline',
        status:
          snapshot.persistentStorageSupported || snapshot.cacheStorageSupported
            ? 'supported'
            : 'partial',
        summary:
          snapshot.persistentStorageSupported
            ? 'Storage quota and persistence can be requested and inspected.'
            : 'Basic storage is available, but persistent storage may not be.',
        details: [
          `Persistent storage API: ${asYesNo(snapshot.persistentStorageSupported)}`,
          `Persisted: ${formatBoolean(snapshot.persistedStorage)}`,
          storageSummary,
          `Background Sync API: ${asYesNo(snapshot.backgroundSyncSupported)}`,
        ],
      },
      {
        title: 'Device APIs',
        status:
          snapshot.wakeLockSupported || snapshot.vibrationSupported
            ? 'supported'
            : snapshot.orientationLockSupported
              ? 'partial'
              : 'unsupported',
        summary:
          snapshot.wakeLockSupported || snapshot.vibrationSupported
            ? 'Wake lock, vibration, and orientation can be tested from the action bar.'
            : 'Most device-level PWA APIs are unavailable in this browser.',
        details: [
          `Wake Lock API: ${asYesNo(snapshot.wakeLockSupported)}`,
          `Wake lock active: ${asYesNo(snapshot.wakeLockActive)}`,
          `Vibration API: ${asYesNo(snapshot.vibrationSupported)}`,
          `Orientation lock: ${asYesNo(snapshot.orientationLockSupported)}`,
        ],
      },
    ]
  }, [snapshot])

  const environmentRows = useMemo(
    () => [
      ['Secure context', asYesNo(snapshot.secureContext)],
      ['Online', asYesNo(snapshot.online)],
      ['Installed display', asYesNo(snapshot.installed)],
      ['Display mode', snapshot.displayMode],
      ['Orientation', `${snapshot.orientationType} (${formatAngle(snapshot.orientationAngle)})`],
      ['Notification permission', snapshot.notificationPermission],
      [
        'Connection',
        snapshot.connection
          ? `${snapshot.connection.effectiveType ?? 'unknown'} / ${snapshot.connection.downlink ?? '?'} Mbps`
          : NOT_AVAILABLE,
      ],
      [
        'Storage',
        snapshot.storageQuota
          ? `${formatBytes(snapshot.storageUsage ?? 0)} / ${formatBytes(snapshot.storageQuota)}`
          : NOT_AVAILABLE,
      ],
      ['Persisted storage', formatBoolean(snapshot.persistedStorage)],
      ['Related apps', snapshot.relatedAppsCount?.toString() ?? NOT_AVAILABLE],
      ['Launch Queue files', snapshot.launchedFiles.toString()],
      ['Last snapshot', formatTimestamp(snapshot.lastUpdated)],
    ],
    [snapshot],
  )

  const handleInstallApp = useCallback(async () => {
    if (!installPromptEvent) {
      addLog('Install prompt is not currently available in this browser state.')
      return
    }

    await installPromptEvent.prompt()
    const result = await installPromptEvent.userChoice
    const outcome = result.outcome === 'accepted' ? 'Accepted install prompt' : 'Dismissed install prompt'

    setInstallPromptEvent(null)
    setInstallOutcome(outcome)
    addLog(`Install prompt result: ${outcome}.`)
    await refreshSnapshot()
  }, [addLog, installPromptEvent, refreshSnapshot])

  const handleRequestNotifications = useCallback(async () => {
    if (!('Notification' in window)) {
      addLog('Notifications are not supported in this browser.')
      return
    }

    const permission = await Notification.requestPermission()
    addLog(`Notification permission is now "${permission}".`)
    await refreshSnapshot()
  }, [addLog, refreshSnapshot])

  const handleShowNotification = useCallback(async () => {
    if (!('Notification' in window)) {
      addLog('Notifications are not supported in this browser.')
      return
    }

    if (Notification.permission !== 'granted') {
      addLog('Grant notification permission before sending a test notification.')
      return
    }

    const registration = await getServiceWorkerRegistration()
    if (registration?.showNotification) {
      await registration.showNotification('PWA API Lab', {
        badge: BASE_ASSET_URL,
        body: 'Test notification sent from the compatibility dashboard.',
        icon: BASE_ASSET_URL,
        tag: 'pwa-api-lab-test',
      })
    } else {
      new Notification('PWA API Lab', {
        body: 'Test notification sent from the compatibility dashboard.',
        icon: BASE_ASSET_URL,
      })
    }

    addLog('Test notification sent.')
  }, [addLog])

  const handleSetBadge = useCallback(async () => {
    const nav = navigator as NavigatorWithExtras
    if (!nav.setAppBadge) {
      addLog('Badging API is not supported in this browser.')
      return
    }

    await nav.setAppBadge(7)
    addLog('App badge set to 7.')
    await refreshSnapshot()
  }, [addLog, refreshSnapshot])

  const handleClearBadge = useCallback(async () => {
    const nav = navigator as NavigatorWithExtras
    if (!nav.clearAppBadge) {
      addLog('Badging API is not supported in this browser.')
      return
    }

    await nav.clearAppBadge()
    addLog('App badge cleared.')
    await refreshSnapshot()
  }, [addLog, refreshSnapshot])

  const handleShare = useCallback(async () => {
    const nav = navigator as NavigatorWithExtras
    if (!nav.share) {
      addLog('Web Share API is not supported in this browser.')
      return
    }

    await nav.share({
      text: 'Checking PWA API compatibility with this browser.',
      title: 'PWA API Lab',
      url: window.location.href,
    })

    addLog('Share sheet opened successfully.')
  }, [addLog])

  const handlePersistStorage = useCallback(async () => {
    if (!navigator.storage?.persist) {
      addLog('Persistent storage API is not supported in this browser.')
      return
    }

    const granted = await navigator.storage.persist()
    addLog(granted ? 'Persistent storage granted.' : 'Persistent storage request was denied.')
    await refreshSnapshot()
  }, [addLog, refreshSnapshot])

  const handleCopySnapshot = useCallback(async () => {
    if (!navigator.clipboard?.writeText) {
      addLog('Clipboard write access is not supported in this browser.')
      return
    }

    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
    addLog('Compatibility snapshot copied to the clipboard.')
  }, [addLog, snapshot])

  const handleWakeLock = useCallback(async () => {
    const nav = navigator as NavigatorWithExtras

    if (wakeLockSentinel && !wakeLockSentinel.released) {
      await wakeLockSentinel.release()
      setWakeLockSentinel(null)
      addLog('Wake lock released.')
      await refreshSnapshot()
      return
    }

    if (!nav.wakeLock?.request) {
      addLog('Wake Lock API is not supported in this browser.')
      return
    }

    const sentinel = await nav.wakeLock.request('screen')
    setWakeLockSentinel(sentinel)
    addLog('Screen wake lock acquired.')
    await refreshSnapshot()
  }, [addLog, refreshSnapshot, wakeLockSentinel])

  const handleVibrate = useCallback(() => {
    const nav = navigator as NavigatorWithExtras
    if (!nav.vibrate) {
      addLog('Vibration API is not supported in this browser.')
      return
    }

    nav.vibrate([80, 40, 80])
    addLog('Vibration pattern requested.')
  }, [addLog])

  const handleRegisterSync = useCallback(async () => {
    const registration = await getServiceWorkerRegistration()
    if (!registration?.sync) {
      addLog('Background Sync API is not available in this browser.')
      return
    }

    await registration.sync.register('pwa-api-lab-manual-sync')
    addLog('Background sync tag registered.')
    await refreshSnapshot()
  }, [addLog, refreshSnapshot])

  const handleRegisterPeriodicSync = useCallback(async () => {
    const registration = await getServiceWorkerRegistration()
    if (!registration?.periodicSync) {
      addLog('Periodic Background Sync API is not available in this browser.')
      return
    }

    await registration.periodicSync.register('pwa-api-lab-periodic-sync', {
      minInterval: 24 * 60 * 60 * 1000,
    })
    addLog('Periodic background sync tag registered.')
    await refreshSnapshot()
  }, [addLog, refreshSnapshot])

  const handleLockOrientation = useCallback(
    async (orientation: 'portrait' | 'landscape') => {
      if (!screen.orientation?.lock) {
        addLog('Screen orientation lock is not supported in this browser.')
        return
      }

      await screen.orientation.lock(orientation)
      addLog(`Screen orientation locked to ${orientation}.`)
      await refreshSnapshot()
    },
    [addLog, refreshSnapshot],
  )

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Progressive Web App test bench</span>
          <h1>PWA API Lab</h1>
          <p className="lede">
            Compare installability and browser API support on desktop and mobile from one
            React-based dashboard.
          </p>
        </div>
        <div className="hero-stats">
          <StatusPill label="Secure" value={snapshot.secureContext} />
          <StatusPill label="Installed" value={snapshot.installed} />
          <StatusPill label="SW controlled" value={snapshot.serviceWorkerControlled} />
          <StatusPill label="Wake lock" value={snapshot.wakeLockActive} />
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Manual test actions</h2>
            <p>Most APIs need a user gesture, so the buttons below are the quickest way to compare browsers.</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => void refreshSnapshot()}>
            Refresh snapshot
          </button>
        </div>
        <div className="actions-grid">
          <ActionButton label="Install app" onClick={() => void handleInstallApp()} />
          <ActionButton
            label="Request notifications"
            onClick={() => void handleRequestNotifications()}
          />
          <ActionButton label="Send test notification" onClick={() => void handleShowNotification()} />
          <ActionButton label="Set app badge" onClick={() => void handleSetBadge()} />
          <ActionButton label="Clear badge" onClick={() => void handleClearBadge()} />
          <ActionButton label="Share current page" onClick={() => void handleShare()} />
          <ActionButton label="Request persistent storage" onClick={() => void handlePersistStorage()} />
          <ActionButton label="Copy JSON snapshot" onClick={() => void handleCopySnapshot()} />
          <ActionButton
            label={snapshot.wakeLockActive ? 'Release wake lock' : 'Request wake lock'}
            onClick={() => void handleWakeLock()}
          />
          <ActionButton label="Vibrate" onClick={handleVibrate} />
          <ActionButton label="Register Background Sync" onClick={() => void handleRegisterSync()} />
          <ActionButton
            label="Register Periodic Sync"
            onClick={() => void handleRegisterPeriodicSync()}
          />
          <ActionButton
            label="Lock portrait orientation"
            onClick={() => void handleLockOrientation('portrait')}
          />
          <ActionButton
            label="Lock landscape orientation"
            onClick={() => void handleLockOrientation('landscape')}
          />
        </div>
      </section>

      <section className="cards-grid">
        {capabilityCards.map((card) => (
          <article className="panel card" key={card.title}>
            <div className="card-header">
              <h2>{card.title}</h2>
              <span className={`badge badge-${card.status}`}>{card.status}</span>
            </div>
            <p className="card-summary">{card.summary}</p>
            <ul className="detail-list">
              {card.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="details-grid">
        <article className="panel">
          <div className="section-header">
            <div>
              <h2>Environment snapshot</h2>
              <p>These values refresh automatically when the browser state changes.</p>
            </div>
          </div>
          <dl className="facts-grid">
            {environmentRows.map(([label, value]) => (
              <div className="fact-row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="panel">
          <h2>Recent activity</h2>
          <ul className="log-list">
            {eventLog.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
          <h3>Diagnostics</h3>
          {snapshot.notes.length > 0 ? (
            <ul className="note-list">
              {snapshot.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No runtime diagnostics reported.</p>
          )}
        </article>
      </section>

      <section className="panel tips-panel">
        <h2>What to compare between devices</h2>
        <div className="tips-grid">
          <p>
            <strong>Installability:</strong> check whether the install prompt appears in Chrome,
            Safari, Edge, and installed app mode.
          </p>
          <p>
            <strong>Background features:</strong> compare service worker control, sync support, and
            whether notifications work after install.
          </p>
          <p>
            <strong>Device APIs:</strong> wake lock, vibration, orientation, and badging often differ
            the most between mobile OS versions.
          </p>
          <p>
            <strong>Storage:</strong> watch quota, persistence, and offline readiness to confirm how
            aggressively the platform may evict cached data.
          </p>
        </div>
      </section>
    </main>
  )
}

type ActionButtonProps = {
  label: string
  onClick: () => void
}

function ActionButton({ label, onClick }: ActionButtonProps) {
  return (
    <button className="action-button" type="button" onClick={onClick}>
      {label}
    </button>
  )
}

type StatusPillProps = {
  label: string
  value: boolean
}

function StatusPill({ label, value }: StatusPillProps) {
  return (
    <span className={`status-pill ${value ? 'status-pill-positive' : 'status-pill-muted'}`}>
      {label}: {value ? 'yes' : 'no'}
    </span>
  )
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatTimestamp(value: string): string {
  if (!value) {
    return NOT_AVAILABLE
  }

  return new Date(value).toLocaleString()
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const scaled = value / 1024 ** index
  return `${scaled.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatBoolean(value: boolean | null): string {
  if (value === null) {
    return NOT_AVAILABLE
  }

  return value ? 'Yes' : 'No'
}

function formatAngle(value: number | null): string {
  return value === null ? NOT_AVAILABLE : `${value}deg`
}

function asYesNo(value: boolean): string {
  return value ? 'Yes' : 'No'
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function getServiceWorkerRegistration(): Promise<
  ServiceWorkerRegistrationWithExtras | undefined
> {
  if (!('serviceWorker' in navigator)) {
    return undefined
  }

  return (await navigator.serviceWorker.getRegistration()) as
    | ServiceWorkerRegistrationWithExtras
    | undefined
}

export default App
