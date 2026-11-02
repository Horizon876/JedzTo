'use client'

export interface PageTabItem {
  id: string
  label: string
  count?: number
}

interface PageTabsProps {
  tabs: PageTabItem[]
  activeId: string
  onChange: (id: string) => void
}

export default function PageTabs({ tabs, activeId, onChange }: PageTabsProps) {
  return (
    <div className="panel-page-tabs" role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`panel-page-tab ${active ? 'is-active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' ? (
              <span className="panel-page-tab-count">{tab.count}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
