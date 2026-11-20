import { Segmented, SelectField } from '@/components/ui/controls'
import type { CIMethod, ModelType, Tau2Method } from '@/lib/stats/pairwise'

export type CIChoice = CIMethod | 'auto'

export interface MetaSettingsState {
  model: ModelType
  tau2Method: Tau2Method
  ci: CIChoice
}

export const DEFAULT_SETTINGS: MetaSettingsState = { model: 'random', tau2Method: 'REML', ci: 'auto' }

export function MetaSettings({ value, onChange }: { value: MetaSettingsState; onChange: (v: MetaSettingsState) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <Segmented
        label="Model"
        value={value.model}
        onChange={(model) => onChange({ ...value, model })}
        options={[
          { value: 'common', label: 'Common effect', hint: 'Also called fixed-effect' },
          { value: 'random', label: 'Random effects' },
        ]}
      />
      {value.model === 'random' && (
        <>
          <SelectField
            label="τ² estimator"
            value={value.tau2Method}
            onChange={(tau2Method) => onChange({ ...value, tau2Method })}
            options={[
              { value: 'REML', label: 'REML (Cochrane default)' },
              { value: 'PM', label: 'Paule–Mandel' },
              { value: 'DL', label: 'DerSimonian–Laird' },
              { value: 'ML', label: 'Maximum likelihood' },
            ]}
          />
          <SelectField
            label="CI for the mean"
            value={value.ci}
            onChange={(ci) => onChange({ ...value, ci })}
            options={[
              { value: 'auto', label: 'Cochrane rule (HKSJ if τ² > 0 and k > 2)' },
              { value: 'hksj', label: 'HKSJ (t, k−1 df)' },
              { value: 'wald', label: 'Wald (z)' },
            ]}
          />
        </>
      )}
    </div>
  )
}
