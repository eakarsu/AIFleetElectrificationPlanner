import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Login from './pages/Login';
import AICenter from './pages/AICenter';
import CrudPage from './pages/CrudPage';
import api from './services/api';
import { recordRows } from './services/api';
import AIResultView, { AIResultValue } from './pages/AIResultView';
import AIFieldPresets, { completeExample } from './pages/AIFieldPresets';

jest.mock('./services/api', () => ({ ...jest.requireActual('./services/api'), login: jest.fn(), getAIFeatures: jest.fn(), aiChat: jest.fn(), getAll: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;

test('record API normalization accepts raw and paginated rows and rejects malformed data', () => {
  const rows = [{ id: 1 }];
  expect(recordRows(rows)).toBe(rows);
  expect(recordRows({ data: rows, pagination: { page: 1, total: 1 } })).toBe(rows);
  expect(() => recordRows({ data: {} })).toThrow('invalid list response');
});

test('presets fill optional fields and preserve only genuine record IDs', () => {
  const fields = [
    { name: 'vehicle_id', type: 'number', requiresExistingRecord: true, options: [42, 58] },
    { name: 'fleet_size', type: 'number' },
    { name: 'region', type: 'text' }
  ];
  const chosen = completeExample(fields, { values: { fleet_size: 24, region: 'Northeast US' } }, 1, 'fleet', { vehicle_id: 58 });
  expect(chosen).toEqual({ vehicle_id: 58, fleet_size: 24, region: 'Northeast US' });
  expect(completeExample([{ ...fields[0], options: [] }], {}, 0, 'fleet', {})).toEqual({ vehicle_id: '' });
});

test('returned and saved JSON renders labels, tables, false, zero and empty strings', () => {
  const fixture = { findings: [{ vehicle_model: 'Van', eligible: false, savings: 0 }], note: '', nested_facts: { ready: false, count: 0 } };
  const returned = renderToStaticMarkup(<AIResultView response={{ result_json: fixture }} />);
  const saved = renderToStaticMarkup(<AIResultValue value={JSON.stringify(fixture)} />);
  for (const html of [returned, saved]) {
    expect(html).toContain('Findings');
    expect(html).toContain('<table');
    expect(html).toContain('Eligible');
    expect(html).toContain('No');
    expect(html).toContain('0');
    expect(html).toContain('Note');
    expect(html).toContain('(empty string)');
    expect(html).toContain('Nested facts');
    expect(html).not.toContain('&quot;vehicle_model&quot;');
  }
});

test('demo credentials button fills only and does not call login', () => {
  process.env.REACT_APP_DEMO_EMAIL = 'demo@example.test';
  process.env.REACT_APP_DEMO_PASSWORD = 'fixture-only';
  const node = document.createElement('div');
  const root = createRoot(node);
  act(() => root.render(<Login onLogin={() => {}} />));
  const button = [...node.querySelectorAll('button')].find(item => item.textContent.includes('Fill Demo Credentials'));
  act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(node.querySelector('input[type=email]').value).toBe('demo@example.test');
  expect(node.querySelector('input[type=password]').value).toBe('fixture-only');
  expect(api.login).not.toHaveBeenCalled();
  act(() => root.unmount());
  delete process.env.REACT_APP_DEMO_EMAIL;
  delete process.env.REACT_APP_DEMO_PASSWORD;
});


test('preset buttons are fill-only controls with three choices', () => {
  const onFill = jest.fn();
  const node = document.createElement('div');
  const root = createRoot(node);
  act(() => root.render(<form onSubmit={event => { event.preventDefault(); throw new Error('submitted'); }}><AIFieldPresets fields={[{ name: 'fleet_size', type: 'number' }, { name: 'region', type: 'text' }]} onFill={onFill} /></form>));
  const buttons = [...node.querySelectorAll('button')];
  expect(buttons).toHaveLength(3);
  expect(buttons.every(button => button.type === 'button')).toBe(true);
  act(() => buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(onFill).toHaveBeenCalledTimes(1);
  expect(onFill.mock.calls[0][1]).toBe(1);
  act(() => root.unmount());
});

test('demo button states missing browser credentials explicitly', () => {
  delete process.env.REACT_APP_DEMO_EMAIL;
  delete process.env.REACT_APP_DEMO_PASSWORD;
  const html = renderToStaticMarkup(<Login onLogin={() => {}} />);
  expect(html).toContain('Demo credentials are not configured');
  expect(html).toContain('disabled=');
});


test('AI Center shows structured returned output and recent history', async () => {
  api.getAIFeatures.mockResolvedValue([]);
  api.aiChat.mockResolvedValue({ result_json: { eligible: false, savings: 0, note: '' } });
  const node = document.createElement('div');
  const root = createRoot(node);
  await act(async () => root.render(<AICenter />));
  const sample = [...node.querySelectorAll('button')].find(button => button.textContent === 'Depot charging');
  act(() => sample.click());
  const send = [...node.querySelectorAll('button')].find(button => button.textContent.includes('Send to AI'));
  await act(async () => send.click());
  expect(node.textContent).toContain('Recent Queries');
  expect(node.textContent).toContain('Eligible');
  expect(node.textContent).toContain('No');
  expect(node.textContent).toContain('(empty string)');
  expect(node.querySelectorAll('.sr-report').length).toBe(2);
  act(() => root.unmount());
});

test('saved record detail renders nested JSON as labeled sections', async () => {
  api.getAll.mockResolvedValue([{ id: 7, name: 'Fleet review', analysis: JSON.stringify({ ready: false, savings: 0, reasons: ['Grid review pending'] }) }]);
  const feature = { key: 'fixture', resource: 'fixture', label: 'Fleet reviews', fields: [{ name: 'name', label: 'Name' }, { name: 'analysis', label: 'Analysis' }], cardFields: ['name'], tableFields: ['name'], aiFields: [], aiLabel: 'AI review' };
  const node = document.createElement('div');
  document.body.appendChild(node);
  const root = createRoot(node);
  await act(async () => root.render(<CrudPage feature={feature} />));
  const card = node.querySelector('.card');
  act(() => card.click());
  expect(document.body.textContent).toContain('Grid review pending');
  expect(document.body.textContent).toContain('Ready');
  expect(document.body.textContent).toContain('No');
  expect(document.body.textContent).toContain('0');
  act(() => root.unmount());
  node.remove();
});

test('record cards and table load 15 rows from the paginated API shape without runtime errors', async () => {
  // Models are the vehicle records in backend/src/seeds/seed.js; IDs here belong only to this isolated UI fixture.
  const seedModels = ['Model 3', 'Model Y', 'F-150 Lightning', 'Bolt EUV', 'R1T', 'iX', 'EQS', 'Ioniq 5', 'EV6', 'ID.4', '2', 'Ariya', 'e-tron GT', 'Air', 'Seal', 'Semi', 'E-Transit'];
  const records = seedModels.map((name, index) => ({ id: index + 1, name, status: 'active' }));
  api.getAll.mockResolvedValue({ data: records, pagination: { page: 1, limit: 20, total: 17 } });
  const feature = { key: 'vehicles', resource: 'vehicles', label: 'Fleet Vehicles', fields: [{ name: 'name', label: 'Name' }, { name: 'status', label: 'Status' }], cardFields: ['name', 'status'], tableFields: ['name', 'status'], aiFields: [], aiLabel: 'AI review' };
  const node = document.createElement('div');
  const root = createRoot(node);
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await act(async () => root.render(<CrudPage feature={feature} />));
    expect(node.querySelectorAll('.cards-grid .card')).toHaveLength(17);
    const tableButton = node.querySelectorAll('.view-toggle button')[1];
    act(() => tableButton.click());
    expect(node.querySelectorAll('.data-table tbody tr')).toHaveLength(17);
    expect(consoleError).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    consoleError.mockRestore();
  }
});

test('invalid record payload shows an explicit loading error', async () => {
  api.getAll.mockResolvedValue({ items: {} });
  const feature = { key: 'vehicles', resource: 'vehicles', label: 'Fleet Vehicles', fields: [{ name: 'name', label: 'Name' }], cardFields: ['name'], tableFields: ['name'], aiFields: [], aiLabel: 'AI review' };
  const node = document.createElement('div');
  const root = createRoot(node);
  await act(async () => root.render(<CrudPage feature={feature} />));
  expect(node.querySelector('[role=alert]').textContent).toContain('invalid list response');
  act(() => root.unmount());
});
