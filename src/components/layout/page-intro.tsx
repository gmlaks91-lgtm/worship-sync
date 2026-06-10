type PageIntroProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <p className="page-eyebrow">{eyebrow}</p>
        <div className="space-y-1">
          <h1 className="page-title">{title}</h1>
          {description ? <p className="page-description">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
