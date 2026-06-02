import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X, AlertCircle, Brain, FileSpreadsheet } from 'lucide-react'

interface SupervisedTestZoneProps {
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
}

interface TestResult {
  index: number
  NUM_SINISTRE: string
  TOTALREGLEMENT: number
  score_suspicion: number
  statut_fraude: string
  niveau_risque: string
  indicateurs_detectes?: string[]
}

const ITEMS_PER_PAGE = 20

const SupervisedTestZone = ({ onSuccess, onError }: SupervisedTestZoneProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [testError, setTestError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[] | null>(null)
  const [modelInfo, setModelInfo] = useState<any>(null)
  const [distribution, setDistribution] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredResults, setFilteredResults] = useState<TestResult[] | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [modalRow, setModalRow] = useState<TestResult | null>(null)

  const API_URL = 'http://localhost:8000'

  // Filtrer les résultats en fonction de la recherche
  useEffect(() => {
    if (!testResults) {
      setFilteredResults(null)
      return
    }
    if (!searchQuery.trim()) {
      setFilteredResults(testResults)
      return
    }
    const query = searchQuery.trim().toLowerCase()
    const filtered = testResults.filter(r =>
      String(r.NUM_SINISTRE || '').toLowerCase().includes(query)
    )
    setFilteredResults(filtered)
    setCurrentPage(1) // Réinitialiser la page lors d'un nouveau filtre
  }, [testResults, searchQuery])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
    }
  }

  const addFiles = (newFiles: File[]) => {
    const excelFiles = newFiles.filter(f => f.name.match(/\.(xlsx|xls)$/i))
    if (excelFiles.length === 0) {
      const msg = "Veuillez sélectionner un fichier Excel (.xlsx ou .xls)"
      setTestError(msg)
      onError?.(msg)
      return
    }
    setFiles(prev => [...prev, ...excelFiles])
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setFiles([])
    setTestResults(null)
    setModelInfo(null)
    setDistribution(null)
    setFilteredResults(null)
    setCurrentPage(1)
    setSearchQuery('')
  }

  const runTest = async () => {
    if (files.length === 0) {
      const msg = "Veuillez sélectionner au moins le fichier sinistres.xlsx"
      setTestError(msg)
      onError?.(msg)
      return
    }

    setTesting(true)
    setTestError(null)

    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))

      const response = await fetch(`${API_URL}/model/test-supervised`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Erreur ${response.status}: ${errorData.detail || response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        setTestResults(result.results)
        setModelInfo(result.model_info)
        setDistribution(result.distribution)
        onSuccess?.(result)
      } else {
        throw new Error(result.error || "Échec du test")
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur lors du test'
      setTestError(msg)
      onError?.(msg)
    } finally {
      setTesting(false)
    }
  }

  const getStatusIcon = (statut: string) => {
    if (statut === 'frauduleux') return <span style={{ color: '#DC2626' }}>🚨</span>
    if (statut === 'suspect') return <span style={{ color: '#D97706' }}>⚠️</span>
    return <span style={{ color: '#059669' }}>✅</span>
  }

  const scoreColor = (score: number) => {
    if (score >= 70) return '#DC2626'
    if (score >= 50) return '#D97706'
    return '#059669'
  }

  const clearSearch = () => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  const currentResults = filteredResults || testResults
  const totalPages = currentResults ? Math.ceil(currentResults.length / ITEMS_PER_PAGE) : 1
  const paginatedResults = currentResults
    ? currentResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Zone d'upload */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('supervised-file-input')?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#3B82F6' : '#9CA3AF'}`,
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? '#EFF6FF' : '#FAFBFC',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Brain className="w-10 h-10 text-blue-500" />
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: '#1F2937', marginBottom: 4 }}>
              Zone Test Mode Supervisé
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
              Déposez sinistres.xlsx (obligatoire), contrats.xlsx, tiers.xlsx (optionnel)
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
              Le modèle XGBoost entraîné appliquera ses prédictions (aucun upload en base)
            </p>
          </div>
          <input
            id="supervised-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            multiple
          />
        </div>
      </div>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>
              Fichiers à tester ({files.length})
            </h4>
            <button
              onClick={clearAll}
              style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Tout supprimer
            </button>
          </div>

          {files.map((file, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                background: '#F9FAFB',
                borderRadius: 8,
                border: '1px solid #E5E7EB'
              }}
            >
              <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => removeFile(index)}
                style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bouton Tester */}
      {files.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={clearAll}
            disabled={testing}
            style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: 8,
              color: '#374151',
              cursor: testing ? 'not-allowed' : 'pointer',
              fontSize: 14
            }}
          >
            Annuler
          </button>
          <button
            onClick={runTest}
            disabled={testing}
            style={{
              padding: '8px 16px',
              background: testing ? '#93C5FD' : '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: testing ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Brain className="w-4 h-4" />
            {testing ? 'Test en cours...' : 'Tester le modèle supervisé'}
          </button>
        </div>
      )}

      {/* Résultats du test */}
      {testResults && distribution && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Brain className="w-5 h-5 text-blue-600" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1F2937' }}>
              Résultats du test supervisé
            </h3>
          </div>

          {/* Infos modèle */}
          {modelInfo && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 12, color: '#6B7280' }}>
              <span>Version: v{modelInfo.active_version}</span>
              <span>·</span>
              <span>Source: {modelInfo.label_source}</span>
            </div>
          )}

          {/* Distribution */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, background: '#FEF2F2', borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#DC2626' }}>{distribution.frauduleux?.count || 0}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Frauduleux ({distribution.frauduleux?.pct || 0}%)</div>
            </div>
            <div style={{ flex: 1, background: '#FFFBEB', borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706' }}>{distribution.suspect?.count || 0}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Suspects ({distribution.suspect?.pct || 0}%)</div>
            </div>
            <div style={{ flex: 1, background: '#ECFDF5', borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>{distribution.normal?.count || 0}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Normaux ({distribution.normal?.pct || 0}%)</div>
            </div>
          </div>

          {/* Barre de recherche */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par numéro de sinistre..."
                  style={{
                    padding: '6px 32px 6px 10px',
                    fontSize: 12,
                    border: '1px solid #E5E7EB',
                    borderRadius: 6,
                    outline: 'none',
                    width: 240,
                    background: 'white',
                    color: '#1F2937'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: '#9CA3AF',
                      display: 'flex'
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  {filteredResults?.length || 0} résultat(s)
                </span>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '4px 8px',
                    fontSize: 12,
                    border: '1px solid #E5E7EB',
                    borderRadius: 4,
                    background: 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  ‹ Précédent
                </button>
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  style={{
                    padding: '4px 8px',
                    fontSize: 12,
                    border: '1px solid #E5E7EB',
                    borderRadius: 4,
                    background: 'white',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage >= totalPages ? 0.5 : 1
                  }}
                >
                  Suivant ›
                </button>
              </div>
            )}
          </div>

          {/* Tableau des résultats */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#F9FAFB', zIndex: 1 }}>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: 8, textAlign: 'left', fontWeight: 600, color: '#374151' }}>#</th>
                  <th style={{ padding: 8, textAlign: 'left', fontWeight: 600, color: '#374151' }}>N° Sinistre</th>
                  <th style={{ padding: 8, textAlign: 'right', fontWeight: 600, color: '#374151' }}>Montant</th>
                  <th style={{ padding: 8, textAlign: 'center', fontWeight: 600, color: '#374151' }}>Score</th>
                  <th style={{ padding: 8, textAlign: 'center', fontWeight: 600, color: '#374151' }}>Statut</th>
                      <th style={{ padding: 8, textAlign: 'left', fontWeight: 600, color: '#374151' }}>Indicateurs</th>
                      <th style={{ padding: 8, textAlign: 'center', fontWeight: 600, color: '#374151' }}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map((r, idx) => {
                  const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx
                  return (
                    <tr
                      key={globalIndex}
                      style={{
                        borderTop: '1px solid #F3F4F6',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      <td style={{ padding: 8, color: '#9CA3AF' }}>{globalIndex + 1}</td>
                      <td style={{ padding: 8, fontFamily: "'DM Mono', monospace", color: '#1F2937', fontWeight: 500 }}>
                        {r.NUM_SINISTRE || '-'}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', color: '#374151' }}>
                        {r.TOTALREGLEMENT?.toLocaleString() || 0} TND
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <span style={{
                          fontFamily: "'DM Mono', monospace",
                          fontWeight: 700,
                          color: scoreColor(r.score_suspicion)
                        }}>
                          {r.score_suspicion.toFixed(1)}
                        </span>
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: r.statut_fraude === 'frauduleux' ? '#FEF2F2' : r.statut_fraude === 'suspect' ? '#FFFBEB' : '#ECFDF5',
                          color: r.statut_fraude === 'frauduleux' ? '#DC2626' : r.statut_fraude === 'suspect' ? '#D97706' : '#059669'
                        }}>
                          {getStatusIcon(r.statut_fraude)}
                          {r.statut_fraude}
                        </span>
                      </td>
                      <td style={{ padding: 8, textAlign: 'left' }}>
                        {(r.indicateurs_detectes && r.indicateurs_detectes.length > 0) ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {r.indicateurs_detectes.slice(0,3).map((i, j) => (
                              <span key={j} style={{ background: '#EEF2FF', color: '#1E40AF', padding: '2px 6px', borderRadius: 6, fontSize: 11 }}>{i}</span>
                            ))}
                            {r.indicateurs_detectes.length > 3 && <span style={{ fontSize: 11, color: '#6B7280' }}>+{r.indicateurs_detectes.length - 3}</span>}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            // open modal with report
                            setModalRow(r)
                          }}
                          style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer' }}
                        >Voir rapport</button>
                        <div style={{ height: 6 }} />
                        <select
                          value={r.statut_fraude}
                          onChange={(e) => {
                            const newVal = e.target.value
                            // update local state only
                            setTestResults(prev => prev ? prev.map(it => it.index === r.index ? { ...it, statut_fraude: newVal } : it) : prev)
                          }}
                          style={{ marginTop: 6, padding: '4px 6px', fontSize: 12 }}
                        >
                          <option value="normal">normal</option>
                          <option value="suspect">suspect</option>
                          <option value="frauduleux">frauduleux</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {currentResults && currentResults.length === 0 && searchQuery && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#6B7280', fontSize: 13 }}>
              Aucun sinistre ne correspond à « {searchQuery} »
            </div>
          )}
        </div>
      )}

      {/* Message d'erreur */}
      {testError && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 8,
          padding: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#DC2626',
          fontSize: 13
        }}>
          <AlertCircle className="w-4 h-4" />
          {testError}
        </div>
      )}

      {/* Note explicative */}
      <div style={{
        background: '#FEF3C7',
        border: '1px solid #FBBF24',
        borderRadius: 8,
        padding: 12,
        fontSize: 12,
        color: '#92400E'
      }}>
        <strong>ℹ️ Note :</strong> Cette zone teste uniquement le modèle XGBoost déjà entraîné.
        Aucune colonne is_fraud n'est générée. Le modèle doit être en mode supervisé (avec labels)
        pour pouvoir utiliser cette fonctionnalité. Uploadez sinistres.xlsx (obligatoire),
        contrats.xlsx et tiers.xlsx (optionnel) pour les jointures.
      </div>
      {/* Rapport modal */}
      {modalRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ width: 720, maxHeight: '80vh', overflowY: 'auto', background: 'white', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Rapport sinistre: {modalRow.NUM_SINISTRE}</h4>
              <button onClick={() => setModalRow(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><strong>Montant</strong><div>{modalRow.TOTALREGLEMENT?.toLocaleString() || 0} TND</div></div>
              <div><strong>Score</strong><div style={{ color: scoreColor(modalRow.score_suspicion), fontWeight: 700 }}>{modalRow.score_suspicion.toFixed(1)}</div></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Statut prédit</strong>
                <div>{modalRow.statut_fraude}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Indicateurs déclenchés</strong>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {(modalRow.indicateurs_detectes && modalRow.indicateurs_detectes.length > 0) ? modalRow.indicateurs_detectes.map((i, k) => (
                    <span key={k} style={{ background: '#EEF2FF', color: '#1E40AF', padding: '4px 8px', borderRadius: 6 }}>{i}</span>
                  )) : <span style={{ color: '#6B7280' }}>Aucun indicateur</span>}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setModalRow(null)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupervisedTestZone

// Modal state and rendering