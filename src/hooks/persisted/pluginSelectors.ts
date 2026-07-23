import type { PluginItem } from '@plugins/types';

export const getLastUsedPluginId = (storedValue: unknown) => {
  if (typeof storedValue === 'string') return storedValue;
  if (
    storedValue &&
    typeof storedValue === 'object' &&
    'id' in storedValue &&
    typeof storedValue.id === 'string'
  ) {
    return storedValue.id;
  }

  return undefined;
};

export const filterInstalledPlugins = (
  installedPlugins: readonly PluginItem[],
  languagesFilter: readonly string[],
) => {
  const enabledLanguages = new Set(languagesFilter);

  return installedPlugins.filter(plugin => enabledLanguages.has(plugin.lang));
};

export const filterAvailablePlugins = (
  availablePlugins: readonly PluginItem[],
  installedPlugins: readonly PluginItem[],
  languagesFilter: readonly string[],
) => {
  const enabledLanguages = new Set(languagesFilter);
  const installedPluginIds = new Set(installedPlugins.map(plugin => plugin.id));

  return availablePlugins
    .filter(
      plugin =>
        enabledLanguages.has(plugin.lang) && !installedPluginIds.has(plugin.id),
    )
    .sort((firstPlugin, secondPlugin) =>
      firstPlugin.name.localeCompare(secondPlugin.name),
    );
};
