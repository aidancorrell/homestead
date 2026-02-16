import { useState, useEffect } from 'react';
import { useAudioStore } from '../../stores/audioStore';
import { setMasterVolume as setEngineVolume, setOutputDevice as setEngineOutput } from '../../lib/audioEngine';

export function AudioSettings() {
  const inputDeviceId = useAudioStore((s) => s.inputDeviceId);
  const outputDeviceId = useAudioStore((s) => s.outputDeviceId);
  const inputVolume = useAudioStore((s) => s.inputVolume);
  const masterVolume = useAudioStore((s) => s.masterVolume);
  const setInputDevice = useAudioStore((s) => s.setInputDevice);
  const setOutputDevice = useAudioStore((s) => s.setOutputDevice);
  const setInputVolume = useAudioStore((s) => s.setInputVolume);
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    async function loadDevices() {
      try {
        // Request mic permission first so we get device labels
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setPermissionGranted(true);

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        setDevices(allDevices);
      } catch {
        // Try to enumerate without permission (labels will be empty)
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          setDevices(allDevices);
        } catch {
          console.error('Could not enumerate devices');
        }
      }
    }

    loadDevices();

    // Listen for device changes (plug/unplug)
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
  }, []);

  const inputDevices = devices.filter((d) => d.kind === 'audioinput');
  const outputDevices = devices.filter((d) => d.kind === 'audiooutput');

  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Voice & Audio
      </h3>

      {!permissionGranted && (
        <p className="mb-3 text-sm text-text-muted">
          Grant microphone permission to see available devices.
        </p>
      )}

      {/* Input Device */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Input Device
        </label>
        <select
          value={inputDeviceId || ''}
          onChange={(e) => setInputDevice(e.target.value || null)}
          className="w-full rounded-lg border border-border-subtle bg-bg-darkest px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="">Default</option>
          {inputDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Output Device */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Output Device
        </label>
        <select
          value={outputDeviceId || ''}
          onChange={(e) => {
            const id = e.target.value || null;
            setOutputDevice(id);
            setEngineOutput(id);
          }}
          className="w-full rounded-lg border border-border-subtle bg-bg-darkest px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="">Default</option>
          {outputDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Speaker ${d.deviceId.slice(0, 5)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Input Volume */}
      <div className="mb-4">
        <label className="mb-1 flex items-center justify-between text-sm font-medium text-text-secondary">
          <span>Input Volume</span>
          <span className="text-xs text-text-muted">{Math.round(inputVolume * 100)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={inputVolume}
          onChange={(e) => setInputVolume(parseFloat(e.target.value))}
          className="w-full accent-accent"
        />
      </div>

      {/* Master Volume */}
      <div className="mb-2">
        <label className="mb-1 flex items-center justify-between text-sm font-medium text-text-secondary">
          <span>Output Volume</span>
          <span className="text-xs text-text-muted">{Math.round(masterVolume * 100)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={masterVolume}
          onChange={(e) => {
            const vol = parseFloat(e.target.value);
            setMasterVolume(vol);
            setEngineVolume(vol);
          }}
          className="w-full accent-accent"
        />
      </div>
    </div>
  );
}
