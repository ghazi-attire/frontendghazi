export function SkeletonBox({ className = '' }) {
  return <div className={`bg-[#e8eaed] animate-pulse rounded-lg ${className}`} />
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={className}>
      {[...Array(lines)].map((_, i) => (
        <SkeletonBox key={i} className={`h-4 mb-2 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-lg border border-line bg-white p-6 ${className}`}>
      <SkeletonBox className="h-5 w-1/3 mb-4" />
      <SkeletonText lines={3} className="space-y-3" />
    </div>
  )
}

export function SkeletonSection({ count = 4, cols = 'sm:grid-cols-2 lg:grid-cols-4' }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonAboutHero() {
  return (
    <div className="bg-[#faf8f5] px-5 py-20 text-center sm:px-8 md:py-28">
      <div className="mx-auto max-w-5xl">
        <SkeletonBox className="h-4 w-32 mx-auto mb-4" />
        <SkeletonBox className="h-12 w-3/4 mx-auto mb-4 rounded-lg" />
        <SkeletonText lines={2} className="space-y-3 mx-auto max-w-2xl mb-8" />
        <SkeletonBox className="h-64 w-full max-w-3xl mx-auto rounded-3xl" />
      </div>
    </div>
  )
}
