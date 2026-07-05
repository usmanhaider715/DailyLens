/** Server-safe JSON-LD injector — pass one object or an array of schema objects. */
export function JsonLd({ data }) {
  const blocks = (Array.isArray(data) ? data : [data]).filter(Boolean);
  return blocks.map((block, i) => (
    <script
      // eslint-disable-next-line react/no-danger
      key={i}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
    />
  ));
}
