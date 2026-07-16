interface PrivyOAuthInfographicProps {
  compact?: boolean;
  embedded?: boolean;
}

const IMAGE_SRC = '/images/blog/privy-oauth-pipeline.svg';
const IMAGE_ALT =
  'Privy + OAuth pipeline: User Client → Privy (AUTH) → Backend (JWT) → MCP (KEY) and OAuth Gateway → Provider APIs';

export function PrivyOAuthInfographic({
  compact = false,
  embedded = false,
}: PrivyOAuthInfographicProps) {
  const containerClass = compact
    ? 'w-full overflow-hidden rounded-xl bg-transparent'
    : embedded
      ? 'w-full overflow-hidden bg-transparent'
      : 'flex min-h-screen w-full items-center justify-center bg-transparent px-8 py-16';

  return (
    <div className={containerClass}>
      <img
        src={IMAGE_SRC}
        alt={IMAGE_ALT}
        className={
          compact
            ? 'block w-full h-auto object-contain'
            : 'block w-full max-w-5xl mx-auto h-auto object-contain'
        }
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
