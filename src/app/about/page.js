'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, HeartHandshake, Leaf, ShieldCheck, Sparkles, Sprout } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { catalogApi } from '@/lib/api'
import { copy, DEFAULT_ABOUT } from '@/lib/pageContent'
import { SkeletonAboutHero, SkeletonBox, SkeletonCard, SkeletonSection, SkeletonText } from '@/components/ui/Skeleton'

const VALUE_ICONS = [Leaf, Sprout, HeartHandshake, Sparkles]
const VALUE_WORDS = ['One', 'Two', 'Three', 'Four']

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const hasText = (value) => String(value ?? '').trim() !== ''
const hasIndexedContent = (content, prefix, count, suffixes = ['']) => Array.from({ length: count }, (_, index) => index + 1)
  .some(index => suffixes.some(suffix => hasOwn(content, `${prefix}${index}${suffix}`)))

export default function AboutPage() {
  const [about, setAbout] = useState({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    catalogApi.home()
      .then(data => setAbout(data.content?.about || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const values = hasIndexedContent(about, 'value', 4, ['Title', ''])
    ? Array.from({ length: 4 }, (_, index) => index + 1)
      .filter(index => hasText(about[`value${index}Title`]) || hasText(about[`value${index}`]))
      .map(index => [about[`value${index}Title`] || '', about[`value${index}`] || ''])
    : VALUE_WORDS.map(word => [copy(about[`value${word}Title`], DEFAULT_ABOUT[`value${word}Title`]), copy(about[`value${word}`], DEFAULT_ABOUT[`value${word}`])])

  const offers = hasIndexedContent(about, 'offer', 4, ['Title', 'Description'])
    ? Array.from({ length: 4 }, (_, index) => index + 1)
      .filter(index => hasText(about[`offer${index}Title`]) || hasText(about[`offer${index}Description`]))
      .map(index => [about[`offer${index}Title`] || '', about[`offer${index}Description`] || ''])
    : Array.from({ length: 4 }, (_, index) => index + 1)
      .map(index => [DEFAULT_ABOUT[`offer${index}Title`], DEFAULT_ABOUT[`offer${index}Description`]])

  const promises = hasIndexedContent(about, 'promise', 6)
    ? Array.from({ length: 6 }, (_, index) => index + 1).filter(index => hasText(about[`promise${index}`])).map(index => about[`promise${index}`])
    : Array.from({ length: 6 }, (_, index) => DEFAULT_ABOUT[`promise${index + 1}`])

  const heroImage = about.imageUrl || DEFAULT_ABOUT.imageUrl

  if (loading) {
    return <MainLayout><main className="overflow-x-hidden bg-white">
      <SkeletonAboutHero />
      <section className="mx-auto grid max-w-[1200px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:py-24">
        <SkeletonText lines={3} className="max-w-md" />
        <SkeletonCard className="min-h-[220px]" />
      </section>
      <section className="bg-[#faf8f5] px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <SkeletonBox className="h-4 w-28 mb-4" />
          <SkeletonBox className="h-10 w-2/3 mb-8" />
          <SkeletonSection count={4} cols="sm:grid-cols-2 lg:grid-cols-4" />
        </div>
      </section>
    </main></MainLayout>
  }

  return <MainLayout><main className="overflow-x-hidden bg-white">
    <section className="bg-[#faf8f5] px-5 py-20 text-center sm:px-8 md:py-28">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[.25em] text-primary">{copy(about.heroLabel, DEFAULT_ABOUT.heroLabel)}</p>
        <h1 className="mt-6 break-words font-display text-4xl font-black leading-[1.02] tracking-tight text-ink sm:text-5xl md:text-7xl">{copy(about.title, DEFAULT_ABOUT.title)}</h1>
        {copy(about.subtitle, DEFAULT_ABOUT.subtitle) && <p className="mx-auto mt-4 max-w-2xl break-words text-lg font-bold text-ink-muted [overflow-wrap:anywhere]">{copy(about.subtitle, DEFAULT_ABOUT.subtitle)}</p>}
        <div className="mx-auto mt-8 max-w-3xl whitespace-pre-line break-words text-base leading-8 text-ink-muted [overflow-wrap:anywhere] sm:text-lg">{copy(about.description, DEFAULT_ABOUT.description)}</div>
        {heroImage && <img src={heroImage} alt={copy(about.title, DEFAULT_ABOUT.title)} className="mx-auto mt-10 max-h-[420px] w-full max-w-3xl rounded-3xl object-cover shadow-sm" />}
      </div>
    </section>

    <section className="mx-auto grid max-w-[1200px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:py-24">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-primary">{copy(about.missionLabel, DEFAULT_ABOUT.missionLabel)}</p>
        <h2 className="mt-5 font-display text-4xl font-black leading-tight text-ink">{copy(about.missionHeading, DEFAULT_ABOUT.missionHeading)}</h2>
      </div>
      <article className="min-w-0 rounded-3xl border border-line bg-white p-7 shadow-sm sm:p-10">
        <p className="break-words text-xl font-black leading-8 text-ink [overflow-wrap:anywhere]">{copy(about.mission, DEFAULT_ABOUT.mission)}</p>
        <p className="mt-5 whitespace-pre-line break-words leading-8 text-ink-muted [overflow-wrap:anywhere]">{copy(about.missionDescription, DEFAULT_ABOUT.missionDescription)}</p>
      </article>
    </section>

    <section className="bg-[#faf8f5] px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1200px]">
        <p className="text-xs font-black uppercase tracking-[.22em] text-primary">{copy(about.offerLabel, DEFAULT_ABOUT.offerLabel)}</p>
        <h2 className="mt-5 max-w-4xl font-display text-3xl font-black leading-tight text-ink sm:text-5xl">{copy(about.offerHeading, DEFAULT_ABOUT.offerHeading)}</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {offers.map(([title, description], index) => <article key={`offer-${index}`} className="min-w-0 rounded-2xl border border-line bg-white p-6"><p className="break-words text-lg font-black text-ink [overflow-wrap:anywhere]">{title}</p><p className="mt-4 break-words text-sm leading-7 text-ink-muted [overflow-wrap:anywhere]">{description}</p></article>)}
        </div>
      </div>
    </section>

    <section className="mx-auto grid max-w-[1200px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
      <article className="min-w-0 rounded-3xl bg-ink p-8 text-white sm:p-10">
        <ShieldCheck className="text-primary-light" size={32}/>
        <h2 className="mt-8 break-words font-display text-3xl font-black [overflow-wrap:anywhere]">{copy(about.qualityHeading, DEFAULT_ABOUT.qualityHeading)}</h2>
        <p className="mt-5 break-words leading-8 text-white/75 [overflow-wrap:anywhere]">{copy(about.qualityDescription, DEFAULT_ABOUT.qualityDescription)}</p>
      </article>
      <div className="space-y-3">{promises.map((item, index) => <div key={`promise-${index}`} className="flex min-w-0 items-start gap-3 rounded-2xl border border-line p-5"><CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={20}/><p className="break-words font-bold text-ink [overflow-wrap:anywhere]">{item}</p></div>)}</div>
    </section>

    <section className="mx-auto max-w-[1200px] px-5 pb-16 sm:px-8 lg:pb-24">
      <p className="text-xs font-black uppercase tracking-[.22em] text-primary">{copy(about.valuesLabel, DEFAULT_ABOUT.valuesLabel)}</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {values.map(([title, body], index) => {
          const Icon = VALUE_ICONS[index] || Sparkles
          return <article key={`value-${index}`} className="min-w-0 rounded-3xl border border-line p-7 sm:p-8"><Icon className="text-primary" size={27}/><h3 className="mt-8 break-words text-2xl font-black text-ink [overflow-wrap:anywhere]">{title}</h3><p className="mt-4 whitespace-pre-line break-words leading-8 text-ink-muted [overflow-wrap:anywhere]">{body}</p></article>
        })}
      </div>
    </section>

    <section className="mx-auto grid max-w-[1200px] gap-5 px-5 pb-16 sm:px-8 lg:grid-cols-2 lg:pb-24">
      <article className="min-w-0 rounded-3xl border border-line p-8 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[.22em] text-primary">{copy(about.visionLabel, DEFAULT_ABOUT.visionLabel)}</p>
        <p className="mt-6 whitespace-pre-line break-words text-xl font-black leading-9 text-ink [overflow-wrap:anywhere]">{copy(about.vision, DEFAULT_ABOUT.vision)}</p>
      </article>
      <article className="min-w-0 rounded-3xl border border-line p-8 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[.22em] text-primary">{copy(about.experienceLabel, DEFAULT_ABOUT.experienceLabel)}</p>
        <p className="mt-6 break-words leading-8 text-ink-muted [overflow-wrap:anywhere]">{copy(about.experienceText, DEFAULT_ABOUT.experienceText)}</p>
        <Link href={copy(about.experienceCtaLink, DEFAULT_ABOUT.experienceCtaLink)} className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-black text-white transition hover:bg-primary-dark">{copy(about.experienceCtaText, DEFAULT_ABOUT.experienceCtaText)}</Link>
      </article>
    </section>
  </main></MainLayout>
}
