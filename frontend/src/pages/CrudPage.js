import RecordDialog from './RecordDialog';
import { AIResultValue } from './AIResultView';
import AIFieldPresets, { completeExample } from './AIFieldPresets';
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Grid3X3, List, Sparkles, X, Edit3, Trash2, ArrowLeft, ChevronRight } from 'lucide-react';
import api, { recordRows } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

export default function CrudPage({ feature }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState('cards');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [showAI, setShowAI] = useState(false);
  const [aiFormData, setAiFormData] = useState({});
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordOptions, setRecordOptions] = useState({});
  const aiFields = feature.aiFields.map(field => {
    if (!/_id$/.test(field.name)) return field;
    return { ...field, requiresExistingRecord: true, options: recordOptions[field.name] || [] };
  });

  const loadItems = useCallback(() => {
    setLoading(true);
    setLoadError('');
    api.getAll(feature.resource)
      .then(data => setItems(recordRows(data)))
      .catch(error => { setItems([]); setLoadError(error.message || 'Unable to load records'); })
      .finally(() => setLoading(false));
  }, [feature.resource]);

  useEffect(() => {
    loadItems();
    setSelectedItem(null);
    setShowForm(false);
    setShowAI(false);
    setAiResult(null);
    setSearch('');
  }, [feature.key, loadItems]);

  const filtered = items.filter(item =>
    Object.values(item).some(v =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );

  const openNew = () => {
    setEditItem(null);
    setFormData({});
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    const data = {};
    feature.fields.forEach(f => {
      let val = item[f.name];
      if (f.type === 'date' && val) val = val.split('T')[0];
      if (f.type === 'datetime-local' && val) val = val.slice(0, 16);
      data[f.name] = val || '';
    });
    setFormData(data);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editItem) {
        await api.update(feature.resource, editItem.id, formData);
      } else {
        await api.create(feature.resource, formData);
      }
      setShowForm(false);
      setSelectedItem(null);
      loadItems();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete this ${feature.label.slice(0, -1) || 'item'}?`)) return;
    try {
      await api.delete(feature.resource, item.id);
      setSelectedItem(null);
      loadItems();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAI = async () => {
    const missing = aiFields.find(field => field.requiresExistingRecord && !field.options.some(id => String(id) === String(aiFormData[field.name])));
    if (missing) { setAiResult({ error: `Select an existing ${missing.label} before generating.` }); return; }
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await api[feature.aiAction](aiFormData);
      setAiResult(result);
    } catch (err) {
      setAiResult({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const openAI = async () => {
    setShowAI(true);
    const references = [...new Set(feature.aiFields.filter(field => /_id$/.test(field.name)).map(field => field.name))];
    for (const name of references) {
      const resource = name === 'vehicle_id' ? 'vehicles' : name === 'route_id' ? 'routes' : null;
      if (!resource) continue;
      try {
        const records = await api.getAll(resource);
        setRecordOptions(previous => ({ ...previous, [name]: recordRows(records).map(record => record.id).filter(id => id !== null && id !== undefined) }));
      } catch (_) { setRecordOptions(previous => ({ ...previous, [name]: [] })); }
    }
  };

  const formatValue = (key, val) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') {
      if (key.includes('cost') || key.includes('amount') || key.includes('budget') || key.includes('tco') || key.includes('savings') || key.includes('estimate') || key.includes('spent')) {
        return '$' + val.toLocaleString();
      }
      if (key.includes('percentage') || key.includes('score')) return val + '%';
      return val.toLocaleString();
    }
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(val).toLocaleDateString();
    }
    return String(val);
  };

  // Detail View
  if (selectedItem && !showForm) {
    return (
      <RecordDialog title={feature.label} onClose={() => setSelectedItem(null)}><div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedItem(null)}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h2>{selectedItem[feature.fields[0]?.name] || `${feature.label} #${selectedItem.id}`}</h2>
              <p>Detail View</p>
            </div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={() => openEdit(selectedItem)}>
              <Edit3 size={14} /> Edit
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedItem)}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        <div className="detail-view">
          <div className="detail-body">
            <div className="detail-grid">
              <div className="detail-field">
                <label>ID</label>
                <span>{selectedItem.id}</span>
              </div>
              {feature.fields.map(f => (
                <div key={f.name} className="detail-field">
                  <label>{f.label}</label>
                  <span>
                    {f.name === 'status' ? (
                      <span className={`badge badge-${selectedItem[f.name]}`}>{selectedItem[f.name]}</span>
                    ) : f.name === 'priority' || f.name === 'penalty_risk' ? (
                      <span className={`badge badge-${selectedItem[f.name]}`}>{selectedItem[f.name]}</span>
                    ) : (
                      selectedItem[f.name] && typeof selectedItem[f.name] === 'object' ? <AIResultValue value={selectedItem[f.name]} /> : typeof selectedItem[f.name] === 'string' && /^[\s]*[\[{]/.test(selectedItem[f.name]) ? <AIResultValue value={selectedItem[f.name]} /> : formatValue(f.name, selectedItem[f.name])
                    )}
                  </span>
                </div>
              ))}
              {selectedItem.created_at && (
                <div className="detail-field">
                  <label>Created</label>
                  <span>{new Date(selectedItem.created_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && renderFormModal()}
      </div></RecordDialog>
    );
  }

  function renderFormModal() {
    return (
      <div className="modal-overlay" onClick={() => setShowForm(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{editItem ? 'Edit' : 'New'} {feature.label}</h3>
            <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
          </div>
          <div className="modal-body">
            {feature.fields.map(f => (
              <div key={f.name} className="form-group">
                <label>{f.label}{f.required && ' *'}</label>
                {f.type === 'select' ? (
                  <select
                    value={formData[f.name] || ''}
                    onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    value={formData[f.name] || ''}
                    onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                    placeholder={f.placeholder}
                  />
                ) : (
                  <input
                    type={f.type}
                    value={formData[f.name] || ''}
                    onChange={e => setFormData({ ...formData, [f.name]: f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })}
                    placeholder={f.placeholder}
                    required={f.required}
                    step={f.type === 'number' ? 'any' : undefined}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderAIModal() {
    return (
      <div className="modal-overlay" onClick={() => { setShowAI(false); setAiResult(null); }}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
          <div className="modal-header">
            <h3><Sparkles size={20} style={{ display: 'inline', marginRight: '8px', color: '#8b5cf6' }} />{feature.aiLabel}</h3>
            <button className="modal-close" onClick={() => { setShowAI(false); setAiResult(null); }}><X size={20} /></button>
          </div>
          <div className="modal-body">
            {!aiResult && (
              <>
                <AIFieldPresets fields={aiFields} context={feature.aiLabel} disabled={aiLoading} onFill={(sample, index) => setAiFormData(previous => ({ ...previous, ...completeExample(aiFields, sample, index, feature.aiLabel, previous) }))} />
                {aiFields.map(f => (
                  <div key={f.name} className="form-group">
                    <label>{f.label}</label>
                    {f.requiresExistingRecord ? <select value={aiFormData[f.name] || ''} onChange={e => setAiFormData({ ...aiFormData, [f.name]: e.target.value })}><option value="">Select an existing {f.label}</option>{f.options.map(id => <option key={id} value={id}>{id}</option>)}</select> : <input
                      type={f.type}
                      value={aiFormData[f.name] || ''}
                      onChange={e => setAiFormData({ ...aiFormData, [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                      placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                      step={f.type === 'number' ? 'any' : undefined}
                    />}
                  </div>
                ))}
                <button className="btn btn-ai btn-lg" onClick={handleAI} disabled={aiLoading} style={{ width: '100%', marginTop: '8px' }}>
                  {aiLoading ? (
                    <><span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', margin: 0 }} /> Analyzing with AI...</>
                  ) : (
                    <><Sparkles size={18} /> Generate AI Analysis</>
                  )}
                </button>
              </>
            )}

            {aiLoading && (
              <div className="ai-thinking" style={{ marginTop: '16px' }}>
                <div className="ai-thinking-dots">
                  <span></span><span></span><span></span>
                </div>
                <span style={{ fontSize: '14px', color: '#64748b' }}>AI is analyzing your data...</span>
              </div>
            )}

            {aiResult && !aiResult.error && (
              <AIResponseDisplay result={aiResult} />
            )}

            {aiResult?.error && (
              <div className="login-error" style={{ marginTop: '16px' }}>
                Error: {aiResult.error}
              </div>
            )}
          </div>
          {aiResult && (
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAiResult(null)}>New Analysis</button>
              <button className="btn btn-primary" onClick={() => { setShowAI(false); setAiResult(null); }}>Done</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{feature.label}</h2>
          <p>{filtered.length} items</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder={`Search ${feature.label.toLowerCase()}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="view-toggle">
            <button className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}>
              <Grid3X3 size={14} />
            </button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
              <List size={14} />
            </button>
          </div>
          <button className="btn btn-ai" onClick={openAI}>
            <Sparkles size={16} /> {feature.aiLabel}
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div><span>Loading...</span></div>
      ) : loadError ? (
        <div className="empty-state" role="alert"><h3>Unable to load {feature.label}</h3><p>{loadError}</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No {feature.label} found</h3>
          <p>Click "Add New" to create your first item.</p>
        </div>
      ) : view === 'cards' ? (
        <div className="cards-grid">
          {filtered.map(item => (
            <div key={item.id} className="card" onClick={() => setSelectedItem(item)}>
              <div className="card-header">
                <div className="card-title">
                  {item[feature.fields[0]?.name] || `#${item.id}`}
                  {item[feature.fields[1]?.name] && feature.fields[0]?.name !== 'name' ? ` ${item[feature.fields[1]?.name]}` : ''}
                </div>
                {item.status && <span className={`badge badge-${item.status}`}>{item.status}</span>}
              </div>
              <div className="card-body">
                {feature.cardFields.slice(1).filter(f => f !== 'status').map(fieldName => {
                  const field = feature.fields.find(ff => ff.name === fieldName);
                  if (!field || item[fieldName] === undefined || item[fieldName] === null) return null;
                  return (
                    <div key={fieldName} className="card-stat">
                      <label>{field.label}</label>
                      <span>{formatValue(fieldName, item[fieldName])}</span>
                    </div>
                  );
                })}
              </div>
              <div className="card-footer">
                <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); openEdit(item); }}>
                  <Edit3 size={12} /> Edit
                </button>
                <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(item); }}>
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                {feature.tableFields.map(f => {
                  const field = feature.fields.find(ff => ff.name === f);
                  return <th key={f}>{field?.label || f}</th>;
                })}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} onClick={() => setSelectedItem(item)} tabIndex={0} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); (() => setSelectedItem(item))(event); } }}>
                  <td>{item.id}</td>
                  {feature.tableFields.map(f => (
                    <td key={f}>
                      {f === 'status' || f === 'priority' || f === 'penalty_risk' ? (
                        <span className={`badge badge-${item[f]}`}>{item[f]}</span>
                      ) : (
                        formatValue(f, item[f])
                      )}
                    </td>
                  ))}
                  <td onClick={(event) => event.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); openEdit(item); }}>
                        <Edit3 size={12} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(item); }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && renderFormModal()}
      {showAI && renderAIModal()}
    </div>
  );
}
