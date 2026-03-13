import type { LucideProps } from 'lucide-react'
import {
  Bell,
  ChartNoAxesColumn,
  CircleDashed,
  ClipboardList,
  ClipboardPlus,
  History,
  LayoutDashboard,
  PackageCheck,
  ScanLine,
  Settings2,
  ShieldCheck,
  Truck,
  Warehouse,
} from 'lucide-react'

type Props = LucideProps & {
  name: string
}

export function AppIcon({ name, ...props }: Props) {
  switch (name) {
    case 'layout-dashboard':
      return <LayoutDashboard {...props} />
    case 'clipboard-plus':
      return <ClipboardPlus {...props} />
    case 'clipboard-list':
      return <ClipboardList {...props} />
    case 'truck':
      return <Truck {...props} />
    case 'shield-check':
      return <ShieldCheck {...props} />
    case 'warehouse':
      return <Warehouse {...props} />
    case 'scan-line':
      return <ScanLine {...props} />
    case 'package-check':
      return <PackageCheck {...props} />
    case 'history':
      return <History {...props} />
    case 'chart-no-axes-column':
      return <ChartNoAxesColumn {...props} />
    case 'settings-2':
      return <Settings2 {...props} />
    case 'bell':
      return <Bell {...props} />
    default:
      return <CircleDashed {...props} />
  }
}
