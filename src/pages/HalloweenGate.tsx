import { Link } from '../i18n/Link';
import { DemoShell } from '../components/DemoShell';
import { FloorAR } from '../components/FloorAR';
import { ArrowRightIcon } from '../components/Icons';
import { ModelViewer } from '../components/ModelViewer';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { buildGate } from '../lib/halloweenGate';
import { useModels, useT } from '../i18n';

export default function HalloweenGate() {
  const d = useT().halloween;
  const gateModel = useModels().gate;
  useDocumentTitle(d.metaTitle);

  return <DemoShell d={d}>
    <div className="mt-8 rounded-3xl border border-line bg-white p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold">{d.realTitle}</h2>
      <p className="mt-2 max-w-2xl text-muted">{d.realText}</p>
      <div className="mt-6"><ModelViewer model={gateModel} className="h-[420px] sm:h-[520px]" label={d.canvasLabel} /></div>
      <p className="mt-4">
        <Link to="/halloween-face" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-electric-700 hover:underline">
          {d.faceLink} <ArrowRightIcon width={16} height={16} />
        </Link>
      </p>
    </div>
    <FloorAR
      build={() => buildGate(d.banner)}
      hideUntilPlaced
      title={`🎃 ${d.startTitle}`}
      text={d.startText}
      dialogLabel={d.dialogLabel}
      canvasLabel={d.canvasLabel}
      photoCaption={d.photoCaption}
      photoAlt={d.photoAlt}
    />
  </DemoShell>;
}
