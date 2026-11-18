const sectionTitles = new Set([
  "Nội dung thăm khám",
  "Chuẩn bị cho buổi khám",
  "Nội dung tư vấn",
  "Cách tiếp cận người bệnh",
  "Trước khi đến khám",
  "Chuẩn bị",
]);

/** Keeps authored paragraphs readable without interpreting database text as HTML. */
export function DescriptionContent({ text }: { text: string }) {
  return (
    <div className="directory-description">
      {text
        .split(/\n\s*\n/)
        .filter(
          (paragraph) =>
            paragraph.trim() && !/^(Thông tin demo|Hồ sơ giả lập)(?:\n|$)/.test(paragraph.trim()),
        )
        .map((paragraph, index) => {
          const [first, ...rest] = paragraph.split("\n");
          return rest.length && sectionTitles.has(first.trim()) ? (
            <section key={index}>
              <h3>{first}</h3>
              <p>{rest.join("\n")}</p>
            </section>
          ) : (
            <p key={index}>{paragraph}</p>
          );
        })}
    </div>
  );
}

export function descriptionPreview(text: string | null | undefined, fallback: string) {
  return text?.split(/\n\s*\n/)[0].trim() || fallback;
}
