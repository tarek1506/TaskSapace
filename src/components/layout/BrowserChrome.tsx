import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  emoji: string
}

const DEFAULT_TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', emoji: '📋' },
  { id: 'tasks', label: 'Tasks', emoji: '✅' },
  { id: 'projects', label: 'Projects', emoji: '📊' },
]

interface BrowserChromeProps {
  activeTab?: string
  onTabChange?: (tabId: string) => void
  children: React.ReactNode
}

export function BrowserChrome({ activeTab = 'dashboard', onTabChange, children }: BrowserChromeProps) {
  const [tabs, setTabs] = useState<Tab[]>(DEFAULT_TABS)
  const [currentTab, setCurrentTab] = useState(activeTab)

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId)
    onTabChange?.(tabId)
  }

  const addTab = () => {
    const count = tabs.length + 1
    const newTab: Tab = { id: `tab-${count}`, label: `Page ${count}`, emoji: '📄' }
    setTabs([...tabs, newTab])
    setCurrentTab(newTab.id)
  }

  const removeTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    const newTabs = tabs.filter(t => t.id !== tabId)
    setTabs(newTabs)
    if (currentTab === tabId && newTabs.length > 0) {
      setCurrentTab(newTabs[newTabs.length - 1].id)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Browser Chrome */}
      <div className="flex items-center h-[38px] bg-[#F3F4F6] border-b border-gray-200 px-2 select-none shrink-0">
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-[6px] mr-3">
          <div className="w-[12px] h-[12px] rounded-full bg-[#FE5F57] border border-[#E03E38]" />
          <div className="w-[12px] h-[12px] rounded-full bg-[#FEBC2E] border border-[#DCA12B]" />
          <div className="w-[12px] h-[12px] rounded-full bg-[#2AC840] border border-[#1FAF34]" />
        </div>

        {/* Nav Arrows */}
        <button className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 mr-1">
          <ChevronLeft size={14} />
        </button>
        <button className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 mr-2">
          <ChevronRight size={14} />
        </button>

        {/* Tab Bar */}
        <div className="flex items-center gap-0 flex-1 overflow-x-auto scrollbar-thin">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-xs rounded-t cursor-pointer whitespace-nowrap border-b-2 transition-colors',
                currentTab === tab.id
                  ? 'bg-white text-gray-900 border-blue-500 font-medium'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-200/50'
              )}
            >
              <span className="text-[11px]">{tab.emoji}</span>
              <span>{tab.label}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => removeTab(e, tab.id)}
                  className="p-[1px] rounded hover:bg-gray-300/60 text-gray-400 hover:text-gray-600 ml-0.5"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addTab}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 ml-1 shrink-0"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>
    </div>
  )
}
