import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from '../i18n/Link';
import { categoryToParam } from '../lib/category';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ModelExplorer } from '../components/ModelExplorer';
import { Gallery } from '../components/Gallery';
import { TryItSection } from '../components/TryItSection';
import { ProjectGrid } from '../components/ProjectGrid';
import { ButtonLink } from '../components/Button';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, InfoIcon } from '../components/Icons';
import NotFound from './NotFound';
import { relatedProjects, useCategoryLabel, useModels, useProjects, useT } from '../i18n';

export default function ProjectDetail() {
  const { slug = '' } = useParams();
  const t = useT();
  const d = t.detail;
  const projects = useProjects();
  const models = useModels();
  const categoryLabel = useCategoryLabel();
  const project = projects.find((p) => p.slug === slug);
  useDocumentTitle(project?.title ?? d.notFoundTitle);

  if (!project) {
    return <NotFound title={d.notFoundTitle} message={d.notFoundText} />;
  }

  const model = models[project.modelId];
  const related = relatedProjects(projects, project);

  return (
    <article>
      <header className="relative overflow-hidden bg-navy-900 pt-28 pb-14 text-white sm:pt-36 sm:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_80%_10%,rgba(37,99,235,0.2),transparent_70%)]"
        />
        <div className="container-page relative">
          <nav aria-label={d.breadcrumb}>
            <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <li>
                <Link to="/projects" className="inline-flex items-center gap-1.5 hover:text-white">
                  <ArrowLeftIcon width={16} height={16} /> {d.projects}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link to={`/projects?category=${categoryToParam(project.category)}`} className="hover:text-white">
                  {categoryLabel(project.category)}
                </Link>
              </li>
            </ol>
          </nav>
          <h1 className="mt-6 max-w-3xl font-display text-4xl leading-[1.08] font-bold sm:text-5xl">{project.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">{project.summary}</p>
          {project.kind === 'concept' && (
            <p className="mt-6 inline-flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <InfoIcon className="mt-0.5 shrink-0 text-electric-400" width={18} height={18} />
              {d.conceptNote}
            </p>
          )}
        </div>
      </header>

      {/* 3D viewer */}
      <section id="viewer" aria-labelledby="viewer-title" className="scroll-mt-20 bg-surface py-14 sm:py-20">
        <div className="container-page">
          <h2 id="viewer-title" className="sr-only">
            {d.viewerTitle}
          </h2>
          <ModelExplorer model={model} viewerClassName="h-[420px] sm:h-[560px]" />
        </div>
      </section>

      {/* Overview + facts */}
      <section aria-labelledby="overview-title" className="py-20 sm:py-24">
        <div className="container-page grid gap-14 lg:grid-cols-[1.6fr_1fr] lg:gap-20">
          <div>
            <h2 id="overview-title" className="font-display text-3xl font-bold">
              {d.overview}
            </h2>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-slate-700">
              {project.overview.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>

            <h3 className="mt-14 font-display text-xl font-bold">{d.challenge}</h3>
            <p className="mt-4 text-[17px] leading-relaxed text-slate-700">{project.challenge}</p>

            <h3 className="mt-12 font-display text-xl font-bold">{d.approach}</h3>
            <ul className="mt-5 space-y-4">
              {project.approach.map((a) => (
                <li key={a} className="flex gap-3 text-[17px] leading-relaxed text-slate-700">
                  <CheckIcon className="mt-1 shrink-0 text-electric-600" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <aside aria-label={d.facts} className="lg:pt-2">
            <dl className="divide-y divide-line rounded-2xl border border-line">
              <Fact label={d.category}>{categoryLabel(project.category)}</Fact>
              <Fact label={d.technologies}>
                <ul className="flex flex-wrap gap-2">
                  {project.technologies.map((t) => (
                    <li key={t} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                      {t}
                    </li>
                  ))}
                </ul>
              </Fact>
              <Fact label={d.platforms}>
                <ul className="space-y-1.5">
                  {project.platforms.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Fact>
              <Fact label={d.deliverables}>
                <ul className="space-y-1.5">
                  {project.deliverables.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </Fact>
              <Fact label={d.asset}>
                <a
                  href={model.credit.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-electric-700 underline-offset-2 hover:underline"
                >
                  {model.credit.title}
                  <span className="sr-only"> {t.footer.newTab}</span>
                </a>
                <span className="block text-sm text-muted">
                  {model.credit.author} · {model.credit.license}
                </span>
              </Fact>
            </dl>
          </aside>
        </div>
      </section>

      {/* Gallery */}
      <section aria-labelledby="gallery-title" className="pb-20 sm:pb-24">
        <div className="container-page">
          <h2 id="gallery-title" className="font-display text-3xl font-bold">
            {d.gallery}
          </h2>
          <p className="mt-3 text-muted">{d.galleryText}</p>
          <div className="mt-8">
            <Gallery images={[project.cover, ...project.gallery]} />
          </div>
        </div>
      </section>

      {/* Video */}
      {project.video && (
        <section aria-labelledby="video-title" className="bg-navy-900 py-20 text-white sm:py-24">
          <div className="container-page grid items-center gap-10 lg:grid-cols-[1fr_2fr]">
            <div>
              <p className="eyebrow text-electric-400">{d.videoEyebrow}</p>
              <h2 id="video-title" className="mt-3 font-display text-3xl font-bold">
                {d.videoTitle}
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">{project.video.description}</p>
              <p className="mt-3 text-sm text-slate-400">{d.videoMeta}</p>
            </div>
            <video
              className="aspect-[3/2] w-full rounded-2xl bg-navy-800 object-cover"
              poster={project.video.poster}
              controls
              playsInline
              muted
              preload="none"
              loop
              aria-describedby="video-title"
            >
              {project.video.sources.map((source) => (
                <source key={source.src} src={source.src} type={source.type} />
              ))}
              {d.videoFallback}{' '}
              <a href={project.video.sources[project.video.sources.length - 1].src} className="underline">
                {d.videoDownload}
              </a>
              .
            </video>
          </div>
        </section>
      )}

      {!project.video && project.tryIt && <TryItSection tryIt={project.tryIt} viewerAnchor="viewer" />}

      {/* Related */}
      <section aria-labelledby="related-title" className="py-20 sm:py-24">
        <div className="container-page">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="related-title" className="font-display text-3xl font-bold">
              {d.related}
            </h2>
            <ButtonLink to="/projects" variant="ghost" icon={<ArrowRightIcon width={16} height={16} />}>
              {d.allProjects}
            </ButtonLink>
          </div>
          <div className="mt-10">
            <ProjectGrid projects={related} />
          </div>
        </div>
      </section>
    </article>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="p-5 sm:p-6">
      <dt className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{label}</dt>
      <dd className="mt-2.5 text-[15px] text-ink">{children}</dd>
    </div>
  );
}
