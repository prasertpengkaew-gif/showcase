import { useEffect, useState } from 'react';
import type { ModelAsset } from '../types/project';
import { ModelViewer, type ViewerStatus } from './ModelViewer';
import { OptionChips } from './OptionChips';

interface ModelExplorerProps {
  model: ModelAsset;
  viewerClassName?: string;
  autoRotate?: boolean;
}

const prettify = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, (c) => c.toUpperCase());

/** ModelViewer plus finish (material variant) and animation pickers when the model provides them. */
export function ModelExplorer({ model, viewerClassName = 'h-[420px] sm:h-[520px]', autoRotate }: ModelExplorerProps) {
  const [variant, setVariant] = useState(model.variants?.[0]);
  const [animation, setAnimation] = useState(model.defaultAnimation ?? model.animations?.[0]);
  const [status, setStatus] = useState<ViewerStatus>('idle');

  useEffect(() => {
    setVariant(model.variants?.[0]);
    setAnimation(model.defaultAnimation ?? model.animations?.[0]);
  }, [model]);

  const hasOptions = Boolean(model.variants?.length || model.animations?.length);

  return (
    <ModelViewer
        model={model}
        variant={variant}
        animation={animation}
        className={viewerClassName}
        autoRotate={autoRotate}
      onStatusChange={setStatus}
    >
      {hasOptions && (
        <div className="flex flex-col gap-6 rounded-2xl border border-line bg-white p-5 sm:flex-row sm:flex-wrap sm:gap-x-10">
          {model.variants && variant && (
            <OptionChips
              legend="Finish"
              options={model.variants}
              value={variant}
              onChange={setVariant}
              format={prettify}
              disabled={status !== 'loaded'}
            />
          )}
          {model.animations && animation && (
            <OptionChips
              legend="Animation"
              options={model.animations}
              value={animation}
              onChange={setAnimation}
              format={prettify}
              disabled={status !== 'loaded'}
            />
          )}
        </div>
      )}
    </ModelViewer>
  );
}
