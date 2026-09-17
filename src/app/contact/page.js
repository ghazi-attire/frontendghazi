'use client'
import { useEffect, useState } from 'react'
import { Clock3, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Send, Twitter, Youtube } from 'lucide-react'
import toast from 'react-hot-toast'
import MainLayout from '@/components/layout/MainLayout'
import { catalogApi } from '@/lib/api'
import { copy, DEFAULT_CONTACT, SOCIAL_LABELS } from '@/lib/pageContent'
import { SkeletonCard, SkeletonText } from '@/components/ui/Skeleton'

const safeHref = (value, fallback = '#') => value && /^(https?:|mailto:|tel:)/i.test(value) ? value : fallback

const SOCIAL_ICONS = { instagram: Instagram, facebook: Facebook, youtube: Youtube, twitter: Twitter, linkedin: Linkedin }

export default function ContactPage() {
  const [content, setContent] = useState({})
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    catalogApi.home()
      .then(data => setContent(data.content || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const contact = content.contact || {}
  const social = content.social || {}

  const cards = [
    [Phone, copy(contact.phoneLabel, DEFAULT_CONTACT.phoneLabel), contact.phone, contact.phone ? `tel:${contact.phone}` : ''],
    [Mail, copy(contact.emailLabel, DEFAULT_CONTACT.emailLabel), contact.email, contact.email ? `mailto:${contact.email}` : ''],
    [MapPin, copy(contact.addressLabel, DEFAULT_CONTACT.addressLabel), contact.address, ''],
    [Clock3, copy(contact.hoursLabel, DEFAULT_CONTACT.hoursLabel), contact.workingHours, ''],
  ]

  const socialLinks = Object.entries(SOCIAL_LABELS)
    .map(([key, label]) => [key, label, social[key] || (key === 'whatsapp' ? contact.whatsapp : '')])
    .filter(([, , url]) => url)

  const successMessage = copy(contact.formSuccessMessage, DEFAULT_CONTACT.formSuccessMessage)

  if (loading) {
    return <MainLayout><main className="overflow-x-hidden bg-white">
      <section className="bg-[#faf8f5] px-5 py-20 text-center sm:px-8 md:py-28">
        <div className="mx-auto max-w-4xl">
          <SkeletonText lines={3} className="mx-auto max-w-2xl" />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[1,2,3,4].map(i => <SkeletonCard key={i} className="min-h-[140px]" />)}
          </div>
        </div>
      </section>
    </main></MainLayout>
  }

  return <MainLayout><main className="overflow-x-hidden bg-white">
    <section className="bg-[#faf8f5] px-5 py-20 text-center sm:px-8 md:py-28">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[.25em] text-primary">{copy(contact.heroLabel, DEFAULT_CONTACT.heroLabel)}</p>
        <h1 className="mt-6 break-words font-display text-5xl font-black leading-[1.02] text-ink sm:text-6xl md:text-7xl">{copy(contact.heroTitle, DEFAULT_CONTACT.heroTitle)}</h1>
        <p className="mx-auto mt-7 max-w-2xl break-words text-base leading-8 text-ink-muted [overflow-wrap:anywhere] sm:text-lg">{copy(contact.heroDescription, DEFAULT_CONTACT.heroDescription)}</p>
      </div>
    </section>

    <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-24">
      <div className="grid gap-5 md:grid-cols-2">
        {cards.map(([Icon, title, value, href]) => <article key={title} className="flex min-w-0 gap-5 rounded-3xl border border-line p-6 sm:p-8"><Icon className="mt-1 shrink-0 text-primary" size={27}/><div className="min-w-0"><p className="text-sm font-black uppercase tracking-wide text-ink">{title}</p>{value ? href ? <a className="mt-3 block break-words text-ink-muted hover:text-primary [overflow-wrap:anywhere]" href={safeHref(href)}>{value}</a> : <p className="mt-3 whitespace-pre-line break-words leading-7 text-ink-muted [overflow-wrap:anywhere]">{value}</p> : <p className="mt-3 text-ink-muted">Add this in Admin → Page Content.</p>}</div></article>)}
      </div>

      {socialLinks.length > 0 && <div className="mt-8 min-w-0 rounded-3xl bg-primary p-7 text-white sm:p-9"><h2 className="break-words font-display text-3xl font-black [overflow-wrap:anywhere]">{copy(contact.socialHeading, DEFAULT_CONTACT.socialHeading)}</h2><div className="mt-6 flex flex-wrap gap-3">{socialLinks.map(([key, label, url]) => { const Icon = SOCIAL_ICONS[key]; return <a key={key} href={safeHref(url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-primary">{Icon && <Icon size={18}/>}{label}</a> })}</div></div>}

      <section className="mt-8 min-w-0 rounded-3xl border border-line p-6 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[.22em] text-primary">{copy(contact.formLabel, DEFAULT_CONTACT.formLabel)}</p>
        <h2 className="mt-4 font-display text-4xl font-black text-ink">{copy(contact.formHeading, DEFAULT_CONTACT.formHeading)}</h2>
        <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={event => { event.preventDefault(); toast.success(successMessage); setForm({ name: '', phone: '', email: '', message: '' }) }}>
          <ContactInput label={copy(contact.formNameLabel, DEFAULT_CONTACT.formNameLabel)} value={form.name} onChange={name => setForm({ ...form, name })} placeholder={copy(contact.formNamePlaceholder, DEFAULT_CONTACT.formNamePlaceholder)} required/>
          <ContactInput label={copy(contact.formPhoneLabel, DEFAULT_CONTACT.formPhoneLabel)} value={form.phone} onChange={phone => setForm({ ...form, phone })} placeholder={copy(contact.formPhonePlaceholder, DEFAULT_CONTACT.formPhonePlaceholder)}/>
          <div className="md:col-span-2"><ContactInput label={copy(contact.formEmailLabel, DEFAULT_CONTACT.formEmailLabel)} type="email" value={form.email} onChange={email => setForm({ ...form, email })} placeholder={copy(contact.formEmailPlaceholder, DEFAULT_CONTACT.formEmailPlaceholder)} required/></div>
          <label className="block min-w-0 md:col-span-2"><span className="text-sm font-black text-ink">{copy(contact.formMessageLabel, DEFAULT_CONTACT.formMessageLabel)}</span><textarea required value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} placeholder={copy(contact.formMessagePlaceholder, DEFAULT_CONTACT.formMessagePlaceholder)} className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-line bg-[#faf8f5] p-4 text-ink outline-none focus:border-primary"/></label>
          <button className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-black text-white transition hover:bg-primary md:col-span-2"><Send size={16}/>{copy(contact.formSubmitText, DEFAULT_CONTACT.formSubmitText)}</button>
        </form>
      </section>
    </section>
  </main></MainLayout>
}

function ContactInput({ label, type = 'text', value, onChange, placeholder, required = false }) {
  return <label className="block min-w-0"><span className="text-sm font-black text-ink">{label}</span><input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-12 w-full min-w-0 rounded-2xl border border-line bg-[#faf8f5] px-4 text-ink outline-none focus:border-primary"/></label>
}
