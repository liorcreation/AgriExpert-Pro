type BrandLogoProps = {
  showName?: boolean;
  descriptor?: string;
  size?: 'compact' | 'standard';
  className?: string;
};

export function BrandLogo({
  showName = true,
  descriptor,
  size = 'standard',
  className = '',
}: BrandLogoProps) {
  return (
    <div className={`brand-lockup brand-lockup-${size} ${className}`.trim()} aria-label="AgriExpert">
      <img src="/brand/app-icon.svg" alt="Logo AgriExpert - le savoir qui germe" />
      {showName && (
        <span className="brand-lockup-copy">
          <strong>AgriExpert</strong>
          {descriptor && <small>{descriptor}</small>}
        </span>
      )}
    </div>
  );
}
