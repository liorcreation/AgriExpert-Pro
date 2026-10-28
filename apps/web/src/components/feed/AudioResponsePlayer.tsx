import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';

type AudioResponsePlayerProps = {
  text: string;
  language: 'fr' | 'mo';
};

const languageOptions = [
  { value: 'fr' as const, label: 'Français', speechLanguage: 'fr-FR' },
  { value: 'mo' as const, label: 'Mooré', speechLanguage: 'mos-MO' },
];

export function AudioResponsePlayer({ text, language: initialLanguage }: AudioResponsePlayerProps) {
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceNotice, setVoiceNotice] = useState('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  const estimatedDuration = Math.max(7, Math.round((text.length * 0.055) / speed));
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const selectedVoice = voices.find((voice) => initialLanguage === 'mo' ? /^(mos|mo)(-|$)/i.test(voice.lang) : voice.lang.toLowerCase().startsWith('fr'));

  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;
    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', updateVoices); stopPlayback(); };
  }, []);

  function stopPlayback() {
    const utterance = utteranceRef.current;
    utteranceRef.current = null;
    if (speechSupported) window.speechSynthesis.cancel();
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
    setIsPlaying(false);
    setProgress(0);
    if (utterance) utterance.onend = utterance.onerror = null;
  }

  function startPlayback() {
    if (!speechSupported) {
      setVoiceNotice('La lecture vocale n’est pas prise en charge par ce navigateur. Le texte de la réponse reste disponible ci-dessus.');
      return;
    }
    window.speechSynthesis.cancel();
    const selectedLanguage = languageOptions.find((item) => item.value === initialLanguage) ?? languageOptions[0];
    const matchingVoice = selectedVoice;
    if (initialLanguage === 'mo' && !matchingVoice) {
      setVoiceNotice('Aucune voix Mooré n’est installée sur cet appareil. La réponse écrite reste disponible ci-dessus.');
      return;
    }
    setVoiceNotice(matchingVoice ? `Lecture dans la langue de la réponse · ${matchingVoice.name}` : 'Voix française disponible sur cet appareil.');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage.speechLanguage;
    if (matchingVoice) utterance.voice = matchingVoice;
    utterance.rate = speed;
    utterance.pitch = 1;
    const finish = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
      setIsPlaying(false);
      setProgress(0);
    };
    utterance.onend = finish;
    utterance.onerror = (event) => {
      if (utteranceRef.current !== utterance) return;
      finish();
      const reason = event.error === 'not-allowed'
        ? 'Le navigateur a bloqué la lecture vocale. Réessayez après une interaction avec la page.'
        : event.error === 'language-unavailable'
          ? `Aucune voix ${selectedLanguage.label} compatible n’est disponible sur cet appareil.`
          : 'La lecture vocale a échoué. Le texte de la réponse reste disponible ci-dessus.';
      setVoiceNotice(reason);
    };
    utteranceRef.current = utterance;
    setIsPlaying(true);
    setProgress(0);
    const startedAt = Date.now();
    progressTimerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setProgress(Math.min(100, (elapsed / estimatedDuration) * 100));
    }, 100);
    try { window.speechSynthesis.speak(utterance); }
    catch {
      stopPlayback();
      setVoiceNotice('Impossible de démarrer la lecture vocale. Le texte de la réponse reste disponible ci-dessus.');
    }
  }

  function togglePlayback() {
    if (isPlaying) stopPlayback();
    else startPlayback();
  }

  function changeSpeed(nextSpeed: number) {
    if (isPlaying) stopPlayback();
    setSpeed(nextSpeed);
  }

  const currentLanguage = languageOptions.find((item) => item.value === initialLanguage) ?? languageOptions[0];

  return (
    <div className="agri-audio-response rounded-control border border-territory-500/15 bg-territory-50/80 p-3 dark:bg-territory-500/5">
      <div className="flex items-center gap-3">
        <button type="button" className="ag-button-primary min-h-10 min-w-10 px-2.5" onClick={togglePlayback} aria-label={isPlaying ? 'Arrêter la lecture' : `Écouter en ${currentLanguage.label}`}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-xs font-bold text-territory-900 dark:text-territory-300"><Volume2 className="h-3.5 w-3.5" /> Écouter la réponse</p><span className="text-[10px] font-semibold text-obsidian-600 dark:text-cream-300">{isPlaying ? `${Math.ceil((progress / 100) * estimatedDuration)}s` : `${estimatedDuration}s`}</span></div>
          <div className="agri-audio-progress mt-2 h-1.5 overflow-hidden rounded-full bg-territory-900/10 dark:bg-territory-500/15" role="progressbar" aria-label="Progression de lecture" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><div className="h-full origin-left rounded-full bg-territory-500" aria-hidden="true" style={{ transform: `scaleX(${progress / 100})` }} /></div>
        </div>
        <span className="rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-bold text-obsidian-600 dark:bg-obsidian-900/70 dark:text-cream-300">{currentLanguage.label}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-territory-500/10 pt-2.5"><span className="agri-audio-voice-source flex items-center gap-1.5 font-medium text-obsidian-600 dark:text-cream-300"><VolumeX className="h-3.5 w-3.5" /> Voix de l’appareil · {currentLanguage.label}</span><div className="flex items-center gap-1"><span className="agri-audio-speed-label mr-1 font-bold text-obsidian-600 dark:text-cream-300">Vitesse</span>{[0.75, 1, 1.25, 1.5].map((item) => <button key={item} type="button" onClick={() => changeSpeed(item)} aria-pressed={speed === item} aria-label={`Vitesse de lecture ${item} fois`} className={['agri-audio-speed-option rounded px-1.5 py-1 font-bold', speed === item ? 'bg-territory-900 text-white dark:bg-territory-500 dark:text-obsidian-950' : 'text-obsidian-600 hover:bg-territory-500/10 dark:text-cream-300'].join(' ')}>{item}x</button>)}</div></div>{voiceNotice && <p className="mt-2 text-[11px] text-obsidian-600 dark:text-cream-300" role="status">{voiceNotice}</p>}
    </div>
  );
}
