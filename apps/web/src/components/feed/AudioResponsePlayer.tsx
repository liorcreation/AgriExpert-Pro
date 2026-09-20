import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Pause, Play, Volume2, VolumeX } from 'lucide-react';

type AudioResponsePlayerProps = {
  text: string;
  language: 'fr' | 'mo';
};

const languageOptions = [
  { value: 'fr' as const, label: 'Français', speechLanguage: 'fr-FR' },
  { value: 'mo' as const, label: 'Mooré', speechLanguage: 'mos-MO' },
];

export function AudioResponsePlayer({ text, language: initialLanguage }: AudioResponsePlayerProps) {
  const [language, setLanguage] = useState<'fr' | 'mo'>(initialLanguage);
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  const estimatedDuration = Math.max(7, Math.round((text.length * 0.055) / speed));

  useEffect(() => () => stopPlayback(), []);

  function stopPlayback() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    utteranceRef.current = null;
    setIsPlaying(false);
    setProgress(0);
  }

  function startPlayback() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const selectedLanguage = languageOptions.find((item) => item.value === language) ?? languageOptions[0];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage.speechLanguage;
    utterance.rate = speed;
    utterance.pitch = 1;
    utterance.onend = () => stopPlayback();
    utterance.onerror = () => stopPlayback();
    utteranceRef.current = utterance;
    setIsPlaying(true);
    setProgress(0);
    const startedAt = Date.now();
    progressTimerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setProgress(Math.min(100, (elapsed / estimatedDuration) * 100));
    }, 100);
    window.speechSynthesis.speak(utterance);
  }

  function togglePlayback() {
    if (isPlaying) stopPlayback();
    else startPlayback();
  }

  function changeLanguage(nextLanguage: 'fr' | 'mo') {
    if (isPlaying) stopPlayback();
    setLanguage(nextLanguage);
  }

  function changeSpeed(nextSpeed: number) {
    if (isPlaying) stopPlayback();
    setSpeed(nextSpeed);
  }

  const currentLanguage = languageOptions.find((item) => item.value === language) ?? languageOptions[0];

  return (
    <div className="rounded-control border border-territory-500/15 bg-territory-50/80 p-3 dark:bg-territory-500/5">
      <div className="flex items-center gap-3">
        <button type="button" className="ag-button-primary min-h-10 min-w-10 px-2.5" onClick={togglePlayback} aria-label={isPlaying ? 'Arrêter la lecture' : `Écouter en ${currentLanguage.label}`}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-xs font-bold text-territory-900 dark:text-territory-300"><Volume2 className="h-3.5 w-3.5" /> Écouter la réponse</p><span className="text-[10px] font-semibold text-obsidian-600 dark:text-cream-300">{isPlaying ? `${Math.ceil((progress / 100) * estimatedDuration)}s` : `${estimatedDuration}s`}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-territory-900/10 dark:bg-territory-500/15"><div className="h-full rounded-full bg-territory-500 transition-[width] duration-100" style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="relative hidden sm:block"><label className="sr-only" htmlFor={`voice-language-${text.slice(0, 8)}`}>Langue audio</label><select id={`voice-language-${text.slice(0, 8)}`} value={language} onChange={(event) => changeLanguage(event.target.value as 'fr' | 'mo')} className="ag-input min-h-9 w-[100px] appearance-none py-1.5 pl-2 pr-6 text-[11px] font-bold"><option value="fr">Français</option><option value="mo">Mooré</option></select><ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-obsidian-600 dark:text-cream-300" /></div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-territory-500/10 pt-2.5"><span className="flex items-center gap-1.5 text-[10px] font-medium text-obsidian-600 dark:text-cream-300"><VolumeX className="h-3.5 w-3.5" /> Synthèse vocale · {currentLanguage.label}</span><div className="flex items-center gap-1"><span className="mr-1 text-[10px] font-bold text-obsidian-600 dark:text-cream-300">Vitesse</span>{[0.75, 1, 1.25, 1.5].map((item) => <button key={item} type="button" onClick={() => changeSpeed(item)} className={['rounded px-1.5 py-1 text-[10px] font-bold', speed === item ? 'bg-territory-900 text-white dark:bg-territory-500 dark:text-obsidian-950' : 'text-obsidian-600 hover:bg-territory-500/10 dark:text-cream-300'].join(' ')}>{item}x</button>)}</div></div>
    </div>
  );
}
