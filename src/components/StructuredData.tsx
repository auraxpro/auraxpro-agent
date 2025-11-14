interface StructuredDataProps {
  data: object | object[];
}

export default function StructuredData({ data }: StructuredDataProps) {
  const scripts = Array.isArray(data) ? data : [data];
  
  return (
    <>
      {scripts.map((scriptData, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(scriptData),
          }}
        />
      ))}
    </>
  );
}

