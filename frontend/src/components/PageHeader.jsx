export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-7 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-earth-700 dark:text-earth-200">{description}</p>}
      </div>
      {action}
    </div>
  );
}
