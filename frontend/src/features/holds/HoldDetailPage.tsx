import { useParams } from 'react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

export function HoldDetailPage() {
  const { holdId } = useParams()
  return (
    <PlaceholderPage title="আবেদনের বিস্তারিত">
      Hold ID: <span className="font-mono">{holdId}</span>
    </PlaceholderPage>
  )
}
