import { useParams } from 'react-router-dom'
import Layout from '../../../components/Layout'
import Board from '../components/Board'

export default function KanbanPage() {
  const { projectId = '' } = useParams<{ projectId: string }>()

  return (
    <Layout>
      <div className="h-[calc(100vh-57px)] flex flex-col">
        <Board projectId={projectId} />
      </div>
    </Layout>
  )
}
