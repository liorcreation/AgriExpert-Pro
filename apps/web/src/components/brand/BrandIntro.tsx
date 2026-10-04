import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type BrandIntroProps = {
  onComplete: () => void;
};

export function BrandIntro({ onComplete }: BrandIntroProps) {
  const prefersReducedMotion = useReducedMotion();
  const reduced = prefersReducedMotion === true;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timeout = window.setTimeout(onComplete, reduced ? 900 : 3500);
    return () => {
      window.clearTimeout(timeout);
      document.body.style.overflow = previousOverflow;
    };
  }, [onComplete, reduced]);

  const instant = reduced ? { duration: 0.01, delay: 0 } : undefined;

  return (
    <motion.div
      className="agri-brand-intro"
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenue sur AgriExpert"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: reduced ? 0.12 : 0.45 } }}
    >
      <div className="agri-intro-ambient agri-intro-ambient-one" aria-hidden="true" />
      <div className="agri-intro-ambient agri-intro-ambient-two" aria-hidden="true" />
      <motion.div
        className="agri-intro-orbit agri-intro-orbit-one"
        aria-hidden="true"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={reduced ? instant : { duration: 24, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="agri-intro-orbit agri-intro-orbit-two"
        aria-hidden="true"
        animate={reduced ? undefined : { rotate: -360 }}
        transition={reduced ? instant : { duration: 32, repeat: Infinity, ease: 'linear' }}
      />

      <button className="agri-intro-skip" type="button" onClick={onComplete} autoFocus>
        Passer l’animation <span aria-hidden="true">→</span>
      </button>

      <div className="agri-intro-content">
        <motion.div
          className="agri-intro-mark-stage"
          initial={reduced ? false : { opacity: 0, y: 22, scale: 0.78, rotateX: -18, rotateY: 16 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0, rotateY: 0 }}
          transition={reduced ? instant : { duration: 1.05, ease: [0.2, 0.85, 0.25, 1] }}
        >
          <div className="agri-intro-mark-shadow" aria-hidden="true" />
          <motion.svg
            className="agri-intro-mark"
            viewBox="0 0 512 512"
            role="img"
            aria-label="Emblème AgriExpert : une jeune pousse au-dessus des sillons"
            animate={reduced ? undefined : { y: [0, -5, 0], rotateZ: [0, -0.8, 0.8, 0] }}
            transition={reduced ? instant : { delay: 1.15, duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}
          >
            <defs>
              <linearGradient id="intro-bg" x1="40" y1="24" x2="470" y2="488" gradientUnits="userSpaceOnUse">
                <stop stopColor="#15513d" />
                <stop offset="1" stopColor="#08291f" />
              </linearGradient>
              <linearGradient id="intro-leaf" x1="174" y1="131" x2="348" y2="369" gradientUnits="userSpaceOnUse">
                <stop stopColor="#c7f36b" />
                <stop offset="1" stopColor="#10b981" />
              </linearGradient>
              <filter id="intro-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="15" />
              </filter>
            </defs>
            <rect width="512" height="512" rx="118" fill="url(#intro-bg)" />
            <motion.circle
              cx="256" cy="256" r="185" fill="none" stroke="#d4af37" strokeWidth="3"
              initial={reduced ? false : { pathLength: 0, opacity: 0.2 }}
              animate={{ pathLength: 1, opacity: [0.2, 0.62, 0.42] }}
              transition={reduced ? instant : { pathLength: { delay: 0.3, duration: 1.15 }, opacity: { delay: 0.3, duration: 1.15 } }}
            />
            <motion.path
              d="M255 364c-2-87 8-148 40-204"
              fill="none" stroke="#f5f7f2" strokeLinecap="round" strokeWidth="15"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={reduced ? instant : { delay: 0.55, duration: 0.9, ease: 'easeOut' }}
            />
            <motion.path
              d="M276 251c-69-1-117-39-128-108 74-4 126 31 128 108Z"
              fill="url(#intro-leaf)"
              style={{ transformOrigin: '100% 100%' }}
              initial={reduced ? false : { opacity: 0, scale: 0.2, rotate: -35 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={reduced ? instant : { delay: 0.82, duration: 0.72, type: 'spring', stiffness: 130, damping: 11 }}
            />
            <motion.path
              d="M285 218c5-75 52-124 123-131 1 75-38 124-123 131Z"
              fill="#10b981"
              style={{ transformOrigin: '0% 100%' }}
              initial={reduced ? false : { opacity: 0, scale: 0.2, rotate: 35 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={reduced ? instant : { delay: 1.02, duration: 0.78, type: 'spring', stiffness: 125, damping: 12 }}
            />
            <motion.path
              d="M128 380c77-34 179-38 257-5"
              fill="none" stroke="#d4af37" strokeLinecap="round" strokeWidth="12"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={reduced ? instant : { delay: 1.12, duration: 0.65, ease: 'easeOut' }}
            />
            <motion.path
              d="M150 407c67-23 144-25 210-2"
              fill="none" stroke="#d4af37" strokeLinecap="round" strokeOpacity=".72" strokeWidth="7"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={reduced ? instant : { delay: 1.35, duration: 0.58, ease: 'easeOut' }}
            />
            <motion.circle
              cx="365" cy="126" r="28" fill="#c7f36b" filter="url(#intro-soft-glow)"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={reduced ? { opacity: 0 } : { opacity: [0, 0.5, 0.14], scale: [0.5, 1.25, 0.8] }}
              transition={reduced ? instant : { delay: 1.15, duration: 1.25, repeat: Infinity, repeatDelay: 0.55 }}
            />
          </motion.svg>
          <motion.span
            className="agri-intro-spark agri-intro-spark-one"
            aria-hidden="true"
            animate={reduced ? undefined : { y: [-4, -20, -4], x: [0, 5, 0], opacity: [0.25, 1, 0.25], scale: [0.75, 1.1, 0.75] }}
            transition={reduced ? instant : { duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="agri-intro-spark agri-intro-spark-two"
            aria-hidden="true"
            animate={reduced ? undefined : { y: [3, -13, 3], x: [0, -4, 0], opacity: [0.15, 0.75, 0.15] }}
            transition={reduced ? instant : { delay: 0.6, duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        <motion.div
          className="agri-intro-wordmark"
          initial={reduced ? false : { opacity: 0, y: 18, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={reduced ? instant : { delay: 1.5, duration: 0.85, ease: 'easeOut' }}
        >
          <p className="agri-intro-overline">PLATEFORME AGROPASTORALE · BURKINA FASO</p>
          <h1>Agri<span>Expert</span></h1>
          <p className="agri-intro-tagline">LE SAVOIR QUI GERME</p>
        </motion.div>
      </div>

      <div className="agri-intro-footer" aria-hidden="true">
        <span>CONSEIL</span><i /><span>TERRITOIRES</span><i /><span>AVENIR</span>
      </div>
      {!reduced && <motion.div className="agri-intro-progress" aria-hidden="true" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 3.35, ease: 'linear' }} />}
    </motion.div>
  );
}
