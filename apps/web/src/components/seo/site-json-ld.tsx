import { getSiteUrl } from "@/lib/site-url";

type JsonLd = Record<string, unknown>;

/**
 * Organization + WebSite structured data for brand search / sitelinks context.
 * Rendered as JSON-LD — not a ranking silver bullet, but still useful signals.
 */
export function SiteJsonLd({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  const site = getSiteUrl();
  const graph: JsonLd[] = [
    {
      "@type": "Organization",
      "@id": `${site}/#organization`,
      name: "Whitefield Ltd",
      alternateName: name,
      url: site,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Oulu",
        addressCountry: "FI",
      },
      logo: `${site}/icon.png`,
      sameAs: ["https://x.com/solviaxapp"],
    },
    {
      "@type": "WebSite",
      "@id": `${site}/#website`,
      name,
      url: site,
      description,
      publisher: { "@id": `${site}/#organization` },
      inLanguage: ["en", "fi"],
    },
    {
      "@type": "SoftwareApplication",
      name,
      applicationCategory: "TravelApplication",
      operatingSystem: "Web, iOS, Android",
      url: site,
      description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
      },
    },
  ];

  const payload = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
