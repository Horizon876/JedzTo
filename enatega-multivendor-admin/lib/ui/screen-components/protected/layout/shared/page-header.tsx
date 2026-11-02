'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'

interface PageHeaderProps {
  title: string
  onAdd?: () => void
  addLabel?: string
  actions?: React.ReactNode
}

export default function PageHeader({
  title,
  onAdd,
  addLabel,
  actions,
}: PageHeaderProps) {
  return (
    <div className="panel-page-header">
      <div className="flex items-center gap-3">
        <h1 className="panel-page-title">{title}</h1>
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="panel-add-btn"
            title={addLabel || 'Dodaj'}
            aria-label={addLabel || 'Dodaj'}
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
