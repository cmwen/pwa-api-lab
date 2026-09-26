# PWA API Lab

React + TypeScript test app for checking Progressive Web App capability support across mobile and desktop browsers.

## What it covers

- install prompt and display mode
- service worker and cache availability
- notifications, badging, and push support detection
- background sync and periodic sync support
- storage quota and persistent storage requests
- Web Share, Launch Queue, File System Access, vibration, wake lock, and orientation lock
- Web Speech API recognition (audio to text) and synthesis (text to speech)
- Navigation API, WebGPU adapter, and Contact Picker interaction probes

## Speech API notes

The speech panel is a browser capability probe, not a guarantee that recognition is local or offline. `SpeechRecognition` has limited cross-browser availability and some implementations send audio to a remote recognition service. `SpeechSynthesis` is broadly available, but the available voices and playback behavior come from the operating system/browser and differ by device. Test over HTTPS, grant microphone access, and compare installed and regular browser modes.

## Additional APIs worth investigating

- **Navigation API:** a newer API for SPA navigation and history management, now marked Baseline 2026 by MDN. The lab requests a same-page fragment navigation; this is not an install-only feature.
- **WebGPU:** useful for high-performance graphics/compute. The lab separately reports API presence and whether a GPU adapter is returned; availability depends on browser, operating system, GPU, and driver.
- **Contact Picker:** useful mobile integration, but experimental/limited availability and user-mediated. The lab requests only the name, email, and telephone fields supported by the browser and displays no contact data.

Sources checked 26 September 2026: [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API), [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [Speech synthesis](https://developer.mozilla.org/en-US/docs/Web/API/Window/speechSynthesis), [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API), [WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API), and [Contact Picker](https://developer.mozilla.org/en-US/docs/Web/API/Contact_Picker_API).

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages deployment

The repository includes:

- `.github/workflows/ci.yml` for lint + build validation
- `.github/workflows/pages.yml` for GitHub Pages deployment from Actions

The Pages workflow automatically sets `VITE_BASE_PATH` to the repository name so the app can be published at:

`https://cmwen.github.io/pwa-api-lab/`
