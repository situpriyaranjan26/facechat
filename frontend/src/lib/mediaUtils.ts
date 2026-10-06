/**
 * Request camera and/or microphone access from the user.
 */
export async function requestMediaPermissions(
  video: boolean,
  audio: boolean
): Promise<MediaStream> {
  const isMobile =
    typeof window !== 'undefined' &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768);

  const constraints: MediaStreamConstraints = {}

  if (video) {
    constraints.video = isMobile
      ? {
          width: { ideal: 640, max: 854 },
          height: { ideal: 480, max: 480 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user',
        }
      : {
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user',
        }
  }

  if (audio) {
    constraints.audio = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }
  }

  return navigator.mediaDevices.getUserMedia(constraints)
}

/**
 * Stop all tracks on a stream.
 */
export function stopAllTracks(stream: MediaStream | null) {
  if (!stream) return
  stream.getTracks().forEach((track) => track.stop())
}

/**
 * Enumerate available media devices.
 */
export async function enumerateDevices(): Promise<MediaDeviceInfo[]> {
  return navigator.mediaDevices.enumerateDevices()
}

/**
 * Get only video input devices.
 */
export async function getCameraDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await enumerateDevices()
  return devices.filter((d) => d.kind === 'videoinput')
}

/**
 * Get only audio input devices.
 */
export async function getMicrophoneDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await enumerateDevices()
  return devices.filter((d) => d.kind === 'audioinput')
}

/**
 * Check if the user has granted camera/mic permissions.
 */
export async function checkPermissions(): Promise<{
  camera: PermissionState
  microphone: PermissionState
}> {
  try {
    const [camera, microphone] = await Promise.all([
      navigator.permissions.query({ name: 'camera' as PermissionName }),
      navigator.permissions.query({ name: 'microphone' as PermissionName }),
    ])
    return { camera: camera.state, microphone: microphone.state }
  } catch {
    // Some browsers don't support querying permissions
    return { camera: 'prompt', microphone: 'prompt' }
  }
}

/**
 * Switch to a specific camera device.
 */
export async function switchCamera(
  stream: MediaStream,
  deviceId: string
): Promise<MediaStream> {
  stopAllTracks(stream)
  return requestMediaPermissions(true, true)
}

/**
 * Format duration in seconds to MM:SS string.
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Format a coin amount with commas.
 */
export function formatCoins(amount: number): string {
  return amount.toLocaleString('en-US')
}
