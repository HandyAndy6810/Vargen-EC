import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_WIDGET_ORDER, resolveWidgetLayout, serializeWidgetLayout, widgetRows } from './home-widgets';

const visibleIds = (raw: string | null) =>
  resolveWidgetLayout(raw).filter((e) => e.visible).map((e) => e.id);

describe('resolveWidgetLayout', () => {
  test('no saved layout gives the default order, all visible', () => {
    assert.deepEqual(visibleIds(null), DEFAULT_WIDGET_ORDER);
    assert.deepEqual(visibleIds(''), DEFAULT_WIDGET_ORDER);
    assert.deepEqual(visibleIds('not json'), DEFAULT_WIDGET_ORDER);
    assert.deepEqual(visibleIds('[]'), DEFAULT_WIDGET_ORDER);
  });

  test('the old column default (never customised) gives the default order', () => {
    const legacy = '["hero","activity","pipeline","actions","revenue","stats","calendar"]';
    assert.deepEqual(visibleIds(legacy), DEFAULT_WIDGET_ORDER);
  });

  test('keeps the saved order exactly', () => {
    const saved = ['nudge', 'revenue', 'pipeline', 'recentquotes', 'weather', 'outstanding', 'schedule', 'customers', 'quickactions', 'upnext'];
    assert.deepEqual(visibleIds(JSON.stringify(saved)), saved);
  });

  test('a hidden widget stays hidden and is not added back at the end', () => {
    const entries = resolveWidgetLayout(JSON.stringify(['weather', '-upnext', 'schedule']));
    const saved = entries.filter((e) => ['weather', 'upnext', 'schedule'].includes(e.id));
    assert.deepEqual(saved, [
      { id: 'weather', visible: true },
      { id: 'upnext', visible: false },
      { id: 'schedule', visible: true },
    ]);
    assert.ok(!visibleIds(JSON.stringify(['weather', '-upnext'])).includes('upnext'));
    assert.equal(entries.filter((e) => e.id === 'upnext').length, 1);
  });

  test('widgets missing from an older layout go in visible, after their default neighbour', () => {
    const ids = visibleIds(JSON.stringify(['revenue', 'schedule']));
    // Saved ones keep their order; nudge follows revenue, outstanding onwards
    // follow schedule; upnext has no neighbour in the layout, so goes last,
    // and quick actions and customers follow it.
    assert.deepEqual(ids, ['revenue', 'nudge', 'schedule', 'outstanding', 'weather', 'recentquotes', 'pipeline', 'upnext', 'quickactions', 'customers']);
  });

  test('c1: Customers, new since a layout was saved, lands right after Quick Actions', () => {
    const before = DEFAULT_WIDGET_ORDER.filter((id) => id !== 'customers');
    const ids = visibleIds(JSON.stringify(before));
    assert.equal(ids[ids.indexOf('quickactions') + 1], 'customers');
    // Quick Actions hidden: Customers still shows, in that spot.
    const hidden = resolveWidgetLayout(JSON.stringify(before.map((id) => (id === 'quickactions' ? '-quickactions' : id))));
    const at = hidden.findIndex((e) => e.id === 'quickactions');
    assert.deepEqual(hidden[at + 1], { id: 'customers', visible: true });
  });

  test('unknown ids and duplicates are dropped, so every entry is a real row', () => {
    const entries = resolveWidgetLayout(JSON.stringify(['oldwidget', 'revenue', '-revenue', 'revenue', 7, '-gone']));
    assert.equal(entries.length, DEFAULT_WIDGET_ORDER.length);
    assert.deepEqual(entries[0], { id: 'revenue', visible: true });
    assert.equal(new Set(entries.map((e) => e.id)).size, entries.length);
  });

  test('round-trips through the saved form', () => {
    const entries = resolveWidgetLayout(JSON.stringify(['pipeline', '-weather', 'upnext']));
    assert.deepEqual(resolveWidgetLayout(serializeWidgetLayout(entries)), entries);
  });
});

describe('widgetRows', () => {
  test('pairs neighbouring half-width widgets only, keeping order', () => {
    assert.deepEqual(widgetRows(['upnext', 'pipeline', 'revenue', 'nudge']), [['upnext'], ['pipeline', 'revenue'], ['nudge']]);
    assert.deepEqual(widgetRows(['outstanding', 'weather', 'revenue']), [['outstanding'], ['weather'], ['revenue']]);
    // Outstanding and the nudge have no half-width layout: never squeezed beside Revenue.
    assert.deepEqual(widgetRows(['revenue', 'outstanding']), [['revenue'], ['outstanding']]);
    assert.deepEqual(widgetRows(['nudge', 'pipeline']), [['nudge'], ['pipeline']]);
  });

  test('flattening the rows gives back the input order', () => {
    assert.deepEqual(widgetRows(DEFAULT_WIDGET_ORDER).flat(), DEFAULT_WIDGET_ORDER);
  });
});
