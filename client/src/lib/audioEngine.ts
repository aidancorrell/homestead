let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let selectedOutputId: string | null = null;

const userNodes = new Map<string, {
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  analyser: AnalyserNode;
}>();

const VAD_THRESHOLD = 15;
const VAD_INTERVAL = 100;
let vadIntervalId: ReturnType<typeof setInterval> | null = null;
let vadCallback: ((userId: string, speaking: boolean) => void) | null = null;
const speakingState = new Map<string, boolean>();

// Local mic monitoring (no playback, just VAD)
let localAnalyser: AnalyserNode | null = null;
let localSource: MediaStreamAudioSourceNode | null = null;
let localUserId: string | null = null;

export function initAudioEngine() {
  if (audioContext) return;
  audioContext = new AudioContext();
  masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);

  // AudioContext often starts suspended; must resume from a user gesture context
  if (audioContext.state === 'suspended') {
    console.log('[Audio] AudioContext suspended, resuming...');
    audioContext.resume().then(() => {
      console.log('[Audio] AudioContext resumed:', audioContext?.state);
    });
  }
  console.log('[Audio] Engine initialized, context state:', audioContext.state);
}

let currentMasterVolume = 1.0;

export function setMasterVolume(volume: number) {
  currentMasterVolume = volume;
  // Apply master volume to all audio elements
  document.querySelectorAll<HTMLAudioElement>('audio[id^="audio-"]').forEach((audio) => {
    audio.volume = Math.min(volume, 1.0);
  });
}

export function setOutputDevice(deviceId: string | null) {
  selectedOutputId = deviceId;
  // Update all existing audio elements
  document.querySelectorAll<HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }>('audio[id^="audio-"]').forEach((audio) => {
    if (audio.setSinkId && deviceId) {
      audio.setSinkId(deviceId).catch(() => {});
    }
  });
}

export function addRemoteStream(userId: string, stream: MediaStream) {
  if (!audioContext || !masterGain) {
    initAudioEngine();
  }

  // Clean up existing nodes for this user
  removeRemoteStream(userId);

  console.log(`[Audio] Adding remote stream for ${userId.slice(0, 8)}, tracks:`, stream.getAudioTracks().length);

  // Web Audio API: source -> analyser (for VAD only, NOT connected to destination)
  const source = audioContext!.createMediaStreamSource(stream);
  const gain = audioContext!.createGain();
  const analyser = audioContext!.createAnalyser();
  analyser.fftSize = 256;

  source.connect(gain);
  gain.connect(analyser);
  // NOTE: Don't connect to masterGain/destination — audio element handles playback

  userNodes.set(userId, { source, gain, analyser });

  // Start VAD monitoring if not already running
  if (!vadIntervalId) {
    startVADMonitoring();
  }

  // Audio element handles actual playback (more reliable than routing through AudioContext.destination)
  const audio = document.createElement('audio') as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
  audio.srcObject = stream;
  audio.autoplay = true;
  audio.id = `audio-${userId}`;

  // Route to selected output device if supported
  if (selectedOutputId && audio.setSinkId) {
    audio.setSinkId(selectedOutputId).catch(() => {});
  }

  // Apply current master volume
  audio.volume = Math.min(currentMasterVolume, 1.0);

  document.body.appendChild(audio);
  audio.play().catch((err) => console.error(`[Audio] Failed to play audio for ${userId.slice(0, 8)}:`, err));
}

export function removeRemoteStream(userId: string) {
  const nodes = userNodes.get(userId);
  if (nodes) {
    nodes.source.disconnect();
    nodes.gain.disconnect();
    nodes.analyser.disconnect();
    userNodes.delete(userId);
  }
  speakingState.delete(userId);

  const audio = document.getElementById(`audio-${userId}`);
  if (audio) audio.remove();

  if (userNodes.size === 0 && !localAnalyser && vadIntervalId) {
    clearInterval(vadIntervalId);
    vadIntervalId = null;
  }
}

export function setUserVolume(userId: string, volume: number) {
  // Control the audio element volume (clamped to 0-1 for the element, gain handles boost)
  const audio = document.getElementById(`audio-${userId}`) as HTMLAudioElement | null;
  if (audio) {
    audio.volume = Math.min(volume, 1.0);
  }
  // Also set the gain node (used if volume > 1.0 for boost via Web Audio)
  const nodes = userNodes.get(userId);
  if (nodes && audioContext) {
    nodes.gain.gain.setValueAtTime(volume, audioContext.currentTime);
  }
}

export function setDeafened(deafened: boolean) {
  // Mute/unmute all audio elements
  document.querySelectorAll<HTMLAudioElement>('audio[id^="audio-"]').forEach((audio) => {
    audio.muted = deafened;
  });
}

export function monitorLocalStream(userId: string, stream: MediaStream) {
  if (!audioContext) initAudioEngine();

  // Clean up previous local monitoring
  stopLocalMonitor();

  localUserId = userId;
  localSource = audioContext!.createMediaStreamSource(stream);
  localAnalyser = audioContext!.createAnalyser();
  localAnalyser.fftSize = 256;

  // Connect source -> analyser only (no output, so we don't hear ourselves)
  localSource.connect(localAnalyser);

  // Start VAD if not already running
  if (!vadIntervalId) {
    startVADMonitoring();
  }
}

function stopLocalMonitor() {
  if (localSource) {
    localSource.disconnect();
    localSource = null;
  }
  if (localAnalyser) {
    localAnalyser.disconnect();
    localAnalyser = null;
  }
  if (localUserId) {
    speakingState.delete(localUserId);
    localUserId = null;
  }
}

export function onVoiceActivity(callback: (userId: string, speaking: boolean) => void) {
  vadCallback = callback;
}

function checkVAD(analyser: AnalyserNode, userId: string) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
  const isSpeaking = average > VAD_THRESHOLD;
  const wasSpeaking = speakingState.get(userId) ?? false;

  if (isSpeaking !== wasSpeaking) {
    speakingState.set(userId, isSpeaking);
    vadCallback?.(userId, isSpeaking);
  }
}

function startVADMonitoring() {
  vadIntervalId = setInterval(() => {
    // Check remote streams
    userNodes.forEach((nodes, userId) => {
      checkVAD(nodes.analyser, userId);
    });

    // Check local mic
    if (localAnalyser && localUserId) {
      checkVAD(localAnalyser, localUserId);
    }
  }, VAD_INTERVAL);
}

export function destroyAudioEngine() {
  if (vadIntervalId) {
    clearInterval(vadIntervalId);
    vadIntervalId = null;
  }

  stopLocalMonitor();

  userNodes.forEach((nodes) => {
    nodes.source.disconnect();
    nodes.gain.disconnect();
    nodes.analyser.disconnect();
  });
  userNodes.clear();
  speakingState.clear();

  // Remove all audio elements
  document.querySelectorAll('audio[id^="audio-"]').forEach((el) => el.remove());

  if (masterGain) {
    masterGain.disconnect();
    masterGain = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}
