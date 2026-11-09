import { useState } from 'react'
import { Download, MonitorDown, Share, X } from 'lucide-react'
import { useInstallPrompt } from '../hooks'

/** Install-as-app control. Native prompt where supported; short instructions elsewhere. */
export const InstallButton = ({ variant = 'nav' }: { variant?: 'nav' | 'card' }) => {
  const { canPrompt, installed, isIOS, isSafari, install } = useInstallPrompt()
  const [help, setHelp] = useState(false)
  if (installed) {
    return variant === 'card' ? <p className="flex items-center gap-2 text-sm text-ink-soft dark:text-ink-darks"><MonitorDown size={16} className="text-[#34c759]" /> PulseX is installed on this device.</p> : null
  }
  const onClick = async () => {
    if (canPrompt) { const r = await install(); if (r !== 'accepted') setHelp(true) }
    else setHelp(true)
  }
  const Help = () => (
    <div className="fade-up relative mt-2 rounded-2xl bg-black/[0.04] p-3 text-xs text-ink-soft dark:bg-white/[0.06] dark:text-ink-darks">
      <button className="absolute right-2 top-2 p-1 text-ink-mute" onClick={() => setHelp(false)} aria-label="Close"><X size={12} /></button>
      {isIOS ? (
        <p>On iPhone or iPad: tap <Share size={12} className="inline -mt-0.5" /> <b>Share</b> in Safari, then <b>Add to Home Screen</b>.</p>
      ) : isSafari ? (
        <p>In Safari on Mac: <b>File → Add to Dock</b>. Chrome or Edge offer one-click install.</p>
      ) : (
        <p>Click the <b>install icon</b> at the right end of the address bar (a monitor with an arrow), or open the browser menu and choose <b>Install PulseX</b>. In Edge: Apps → Install this site as an app.</p>
      )}
    </div>
  )
  if (variant === 'card') {
    return (
      <div>
        <button className="btn-primary" onClick={onClick}><Download size={15} /> Install PulseX as an app</button>
        {help && <Help />}
      </div>
    )
  }
  return (
    <div>
      <button className="nav-item w-full" onClick={onClick}><Download size={18} /><span>Install app</span></button>
      {help && <Help />}
    </div>
  )
}
