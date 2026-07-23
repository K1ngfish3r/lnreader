import type { PluginItem } from '@plugins/types';

import {
  filterAvailablePlugins,
  filterInstalledPlugins,
  getLastUsedPluginId,
} from '../pluginSelectors';

const createPlugin = (id: string, name: string, lang: string): PluginItem => ({
  id,
  name,
  lang,
  site: `https://${id}.example.com`,
  version: '1.0.0',
  url: `https://example.com/${id}.js`,
  iconUrl: `https://example.com/${id}.png`,
});

describe('plugin selectors', () => {
  const englishPlugin = createPlugin('english', 'Zulu', 'English');
  const spanishPlugin = createPlugin('spanish', 'Alpha', 'Spanish');
  const secondEnglishPlugin = createPlugin(
    'english-second',
    'Bravo',
    'English',
  );

  it('derives installed plugins from the language filter', () => {
    expect(
      filterInstalledPlugins([englishPlugin, spanishPlugin], ['English']),
    ).toEqual([englishPlugin]);
  });

  it('derives available plugins by language and installation status', () => {
    expect(
      filterAvailablePlugins(
        [englishPlugin, spanishPlugin, secondEnglishPlugin],
        [englishPlugin],
        ['English'],
      ),
    ).toEqual([secondEnglishPlugin]);
  });

  it('sorts available plugins without mutating persisted input', () => {
    const availablePlugins = [englishPlugin, secondEnglishPlugin];

    expect(
      filterAvailablePlugins(availablePlugins, [], ['English']).map(
        plugin => plugin.name,
      ),
    ).toEqual(['Bravo', 'Zulu']);
    expect(availablePlugins).toEqual([englishPlugin, secondEnglishPlugin]);
  });

  it('reads both current and legacy last-used plugin values', () => {
    expect(getLastUsedPluginId(englishPlugin.id)).toBe(englishPlugin.id);
    expect(getLastUsedPluginId(englishPlugin)).toBe(englishPlugin.id);
    expect(getLastUsedPluginId(undefined)).toBeUndefined();
  });
});
