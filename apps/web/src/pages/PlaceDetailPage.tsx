import { useParams } from 'react-router-dom'

export default function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Place Details</h1>
      <p className="text-gray-500">Place ID: {id}</p>
    </div>
  )
}
