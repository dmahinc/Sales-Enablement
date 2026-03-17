import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { ArrowLeft, BarChart3, Eye, Download, FileText, Loader } from 'lucide-react'

export default function RoomAnalytics() {
  const { id } = useParams<{ id: string }>()

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['room-analytics', id],
    queryFn: () => api.get(`/deal-rooms/${id}/analytics`).then(res => res.data),
    enabled: !!id,
  })

  if (isLoading || !analytics) {
    return (
      <div className="p-6 flex justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/deal-rooms" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Deal Rooms
      </Link>

      <h1 className="text-2xl font-semibold text-slate-800 mb-2">{analytics.room_name}</h1>
      <p className="text-slate-600 mb-6">Engagement analytics for this Digital Sales Room</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card-ovh p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Total views</span>
          </div>
          <p className="text-2xl font-semibold text-slate-800">{analytics.access_count}</p>
        </div>
        <div className="card-ovh p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Unique visitors</span>
          </div>
          <p className="text-2xl font-semibold text-slate-800">{analytics.unique_visitors}</p>
        </div>
        <div className="card-ovh p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Download className="w-4 h-4" />
            <span className="text-sm">Total downloads</span>
          </div>
          <p className="text-2xl font-semibold text-slate-800">{analytics.total_downloads}</p>
        </div>
        <div className="card-ovh p-4">
          <span className="text-sm text-slate-500">Last viewed</span>
          <p className="text-slate-800 mt-1">
            {analytics.last_accessed_at
              ? new Date(analytics.last_accessed_at).toLocaleString()
              : 'Never'}
          </p>
        </div>
      </div>

      <div className="card-ovh p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Material engagement
        </h2>
        {analytics.material_views?.length === 0 ? (
          <p className="text-slate-500">No material views yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-sm font-medium text-slate-600">Material</th>
                  <th className="text-right py-2 text-sm font-medium text-slate-600">Views</th>
                  <th className="text-right py-2 text-sm font-medium text-slate-600">Downloads</th>
                </tr>
              </thead>
              <tbody>
                {analytics.material_views?.map((m: any) => (
                  <tr key={m.material_id} className="border-b border-slate-100">
                    <td className="py-3 text-slate-800">{m.material_name}</td>
                    <td className="py-3 text-right">{m.views}</td>
                    <td className="py-3 text-right">{m.downloads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
