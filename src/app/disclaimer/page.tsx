import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Disclaimer',
  description:
    'BookSnag does not host, store, or distribute any audiobook content. This tool fetches publicly accessible files from third-party sites at the user\'s request.',
  robots: { index: true, follow: true },
}

export default function DisclaimerPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link href="/" className="legal-back">← Back to BookSnag</Link>

        <h1 className="legal-title">Disclaimer</h1>
        <p className="legal-updated">Last updated: April 2026</p>

        <section className="legal-section">
          <h2>What BookSnag is</h2>
          <p>
            BookSnag is a free, open-source tool that helps users access audio files
            that are already publicly available on third-party websites. It is a
            client &mdash; not a content library.
          </p>
        </section>

        <section className="legal-section">
          <h2>What BookSnag is not</h2>
          <p>
            <strong>BookSnag does not host, store, cache, upload, or redistribute
            any audiobook content.</strong> All audio is fetched directly from the
            third-party source at the moment the user requests it. This project
            does not operate, control, or have any affiliation with the sites it
            links to.
          </p>
        </section>

        <section className="legal-section">
          <h2>Your responsibility</h2>
          <p>
            You are responsible for complying with the terms of service of the
            source websites and with copyright law in your jurisdiction. Only
            download content that you are legally permitted to download. If you
            are unsure whether a particular file is permitted, do not download
            it.
          </p>
        </section>

        <section className="legal-section">
          <h2>Copyright concerns</h2>
          <p>
            Because BookSnag does not host any content, copyright complaints
            should be directed to the site that hosts the file. If you believe
            the BookSnag project itself should remove or change support for a
            particular source site, open an issue on the project&apos;s GitHub
            repository.
          </p>
        </section>

        <section className="legal-section">
          <h2>No warranty</h2>
          <p>
            BookSnag is provided &ldquo;as is&rdquo; under the MIT License, without
            warranty of any kind. The authors and contributors are not liable for
            any damages arising from use of this tool.
          </p>
        </section>

        <section className="legal-section">
          <h2>Data</h2>
          <p>
            BookSnag does not have user accounts and does not collect personal
            data. A small set of UI preferences is stored in your browser&apos;s
            <code> localStorage</code> and never leaves your device.
          </p>
        </section>
      </div>
    </main>
  )
}
