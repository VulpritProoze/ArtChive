interface SkeletonHeroImageProps {
  /** Height of the hero image */
  height?: string;
  /** Custom className */
  className?: string;
}

export function SkeletonHeroImage({ 
  height = 'h-64',
  className = '' 
}: SkeletonHeroImageProps) {
  return (
    <div className={`w-full ${height} bg-gradient-to-r from-orange-400 via-yellow-300 to-blue-300 rounded-xl overflow-hidden ${className}`}>
      <div className="w-full h-full skeleton"></div>
    </div>
  );
}

