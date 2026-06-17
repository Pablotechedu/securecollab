import { useState, type FormEvent } from 'react'
import Layout from '../../../components/Layout'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorMessage from '../../../components/ErrorMessage'
import OrgCard from '../components/OrgCard'
import { useOrgs } from '../hooks/useOrgs'

export default function OrgListPage() {
  const { orgs, loading, error, createOrg } = useOrgs()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<unknown>(null)
  const [creating, setCreating] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setCreating(true)
    try {
      await createOrg(name, description || undefined)
      setName('')
      setDescription('')
      setShowForm(false)
    } catch (err) {
      setFormError(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Your Organizations</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            + New Organization
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 bg-white border border-gray-200 rounded-xl p-5 space-y-3"
          >
            <h2 className="font-semibold text-gray-800">New Organization</h2>
            <input
              type="text"
              required
              placeholder="Organization name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            {formError != null && <ErrorMessage error={formError} />}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading && <LoadingSpinner label="Loading organizations" />}
        {error != null && <ErrorMessage error={error} />}

        {!loading && !error && orgs.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-12">
            You don&apos;t belong to any organization yet. Create one above.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <OrgCard key={org._id} org={org} />
          ))}
        </div>
      </div>
    </Layout>
  )
}
