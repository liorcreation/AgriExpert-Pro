import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Mic, Pause, Play, RotateCcw, Square } from 'lucide-react';

type AudioRecorderProps = {
  onRecordingChange?: (recording: Blob | null) => void;
};

export function AudioRecorder({ onRecordingChange }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = window.setInterval(() => setDuration((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Votre navigateur ne permet pas l’enregistrement audio.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingChange?.(blob);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start();
      setDuration(0);
      setIsRecording(true);
    } catch {
      setError('L’accès au microphone a été refusé. Autorisez-le pour envoyer une note vocale.');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }

  function resetRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
    onRecordingChange?.(null);
  }

  function togglePlayback() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
      setIsPlaying(true);
    }
  }

  return (
    <div className="rounded-card border border-dashed border-territory-300 bg-territory-50/70 p-4 dark:border-territory-700 dark:bg-territory-500/5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-territory-900 text-white dark:bg-territory-500 dark:text-obsidian-950">
          <Mic className={['h-5 w-5', isRecording ? 'animate-pulse' : ''].join(' ')} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-obsidian-900 dark:text-cream-50">Ajouter une note vocale</p>
          <p className="mt-1 text-xs leading-5 text-obsidian-600 dark:text-cream-300">Décrivez les symptômes ou les dégâts dans votre langue la plus confortable.</p>
        </div>
        {isRecording && <span className="rounded-full bg-danger-50 px-2 py-1 text-[10px] font-bold text-danger-600 dark:bg-danger-500/10 dark:text-danger-500">REC {formatDuration(duration)}</span>}
      </div>

      {!isRecording && !audioUrl && (
        <button type="button" className="ag-button-secondary mt-4 w-full" onClick={() => void startRecording()}>
          <Mic className="h-4 w-4" /> Démarrer l’enregistrement
        </button>
      )}

      {isRecording && (
        <button type="button" className="ag-button-emergency mt-4 w-full" onClick={stopRecording}>
          <Square className="h-4 w-4 fill-current" /> Arrêter · {formatDuration(duration)}
        </button>
      )}

      {audioUrl && !isRecording && (
        <div className="mt-4 flex items-center gap-2 rounded-control bg-white/70 p-2 dark:bg-obsidian-900/70">
          <button type="button" className="ag-button-primary min-h-10 min-w-10 px-2.5" onClick={togglePlayback} aria-label={isPlaying ? 'Mettre en pause' : 'Écouter la note vocale'}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1"><p className="text-xs font-bold text-obsidian-800 dark:text-cream-100">Note vocale prête</p><p className="text-[11px] text-obsidian-600 dark:text-cream-300">{formatDuration(duration)} · audio sécurisé</p></div>
          <CheckCircle2 className="h-5 w-5 text-success-600" />
          <button type="button" className="ag-button-ghost min-h-10 min-w-10 px-2.5" onClick={resetRecording} aria-label="Supprimer la note vocale"><RotateCcw className="h-4 w-4" /></button>
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
        </div>
      )}

      {error && <p className="mt-3 flex items-start gap-2 text-xs font-medium leading-5 text-danger-600 dark:text-danger-500"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
    </div>
  );
}

function formatDuration(value: number) {
  const minutes = Math.floor(value / 60).toString().padStart(2, '0');
  const seconds = (value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
