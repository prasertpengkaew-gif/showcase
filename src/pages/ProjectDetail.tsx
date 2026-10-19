import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProjectBySlug, getRelatedProjects } from '../data/projects';
import { getModel } from '../data/models';
import { categoryToParam } from '../lib/category';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ModelExplorer } from '../components/ModelExplorer';
import { Gallery } from '../components/Gallery';
import { ProjectGrid } from '../components/ProjectGrid';
import { ButtonLink } from '../components/Button';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, InfoIcon } from '../components/Icons';
import NotFound from './NotFound';

export default function ProjectDetail() {
  const { slug = '' } = useParams();
  const project = getProjectBySlug(slug);
  useDocumentTitle(project?.title ?? 'Project not found');

  if (!project) {
    return <NotFound title="Project not found" message="We couldn't find that project. It may have been renamed or removed." />;
  }

  const model = getModel(project.modelId);
  const related = getRelatedProjects(project);

  return (
    <article>
      <header className="relative overflow-hidden bg-navy-900 pt-28 pb-14 text-white sm:pt-36 sm:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_80%_10%,rgba(37,99,235,0.2),transparent_70%)]"
        />
        <div className="container-page relative">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <li>
                <Link to="/projects" className="inline-flex items-center gap-1.5 hover:text-white">
                  <ArrowLeftIcon width={16} height={16} /> Projects
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link to={`/projects?category=${categoryToParam(project.category)}`} className="hover:text-white">
                  {project.category}
                </Link>
              </li>
            </ol>
          </nav>
          <h1 className="mt-6 max-w-3xl font-display text-4xl leading-[1.08] font-bold sm:text-5xl">{project.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">{project.summary}</p>
          {project.kind === 'concept' && (
            <p className="mt-6 inline-flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <InfoIcon className="mt-0.5 shrink-0 text-electric-400" width={18} height={18} />
              Studio concept built with an openly licensed sample model — not a client engagement.
            </p>
          )}
        </div>
      </header>

      {/* 3D viewer */}
      <section aria-labelledby="viewer-title" className="bg-surface py-14 sm:py-20">
        <div className="container-page">
          <h2 id="viewer-title" className="sr-only">
            Interactive 3D model
          </h2>
          <ModelExplorer model={model} viewerClassName="h-[420px] sm:h-[560px]" />
        </div>
      </section>

      {/* Overview + facts */}
      <section aria-labelledby="overview-title" className="py-20 sm:py-24">
        <div className="container-page grid gap-14 lg:grid-cols-[1.6fr_1fr] lg:gap-20">
          <div>
            <h2 id="overview-title" className="font-display text-3xl font-bold">
              Overview
            </h2>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-slate-700">
              {project.overview.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>

            <h3 className="mt-14 font-display text-xl font-bold">The challenge</h3>
            <p className="mt-4 text-[17px] leading-relaxed text-slate-700">{project.challenge}</p>

            <h3 className="mt-12 font-display text-xl font-bold">Our approach</h3>
            <ul className="mt-5 space-y-4">
              {project.approach.map((a) => (
                <li key={a} className="flex gap-3 text-[17px] leading-relaxed text-slate-700">
                  <CheckIcon className="mt-1 shrink-0 text-electric-600" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <aside aria-label="Project facts" className="lg:pt-2">
            <dl className="divide-y divide-line rounded-2xl border border-line">
              <Fact label="Category">{project.category}</Fact>
              <Fact label="Technologies">
                <ul className="flex flex-wrap gap-2">
                  {project.technologies.map((t) => (
                    <li key={t} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                      {t}
                    </li>
                  ))}
                </ul>
              </Fact>
              <Fact label="Platforms">
                <ul className="space-y-1.5">
                  {project.platforms.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Fact>
              <Fact label="Deliverables">
                <ul className="space-y-1.5">
                  {project.deliverables.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </Fact>
              <Fact label="3D asset">
                <a
                  href={model.credit.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-electric-700 underline-offset-2 hover:underline"
                >
                  {model.credit.title}
                  <span className="sr-only"> (opens in a new tab)</span>
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
            Gallery
          </h2>
          <p className="mt-3 text-muted">Real-time renders of the model used in this project. Select an image to enlarge it.</p>
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
              <p className="eyebrow text-electric-400">Demo video</p>
              <h2 id="video-title" className="mt-3 font-display text-3xl font-bold">
                See it in motion
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">{project.video.description}</p>
              <p className="mt-3 text-sm text-slate-500">5 seconds · no audio</p>
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
              Your browser can't play this video.{' '}
              <a href={project.video.sources[project.video.sources.length - 1].src} className="underline">
                Download the MP4
              </a>
              .
            </video>
          </div>
        </section>
      )}

      {/* Related */}
      <section aria-labelledby="related-title" className="py-20 sm:py-24">
        <div className="container-page">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="related-title" className="font-display text-3xl font-bold">
              Related projects
            </h2>
            <ButtonLink to="/projects" variant="ghost" icon={<ArrowRightIcon width={16} height={16} />}>
              All projects
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
      <dt className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">{label}</dt>
      <dd className="mt-2.5 text-[15px] text-ink">{children}</dd>
    </div>
  );
}
