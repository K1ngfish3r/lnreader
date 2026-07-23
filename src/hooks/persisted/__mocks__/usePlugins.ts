const pluginActions = {
  setLastUsedPluginId: jest.fn(),
  refreshPlugins: jest.fn(),
  toggleLanguageFilter: jest.fn(),
  installPlugin: jest.fn(),
  uninstallPlugin: jest.fn(),
  updatePlugin: jest.fn(),
  togglePinPlugin: jest.fn(),
};

export const useFilteredAvailablePlugins = jest.fn(() => []);
export const useFilteredInstalledPlugins = jest.fn(() => []);
export const useInstalledPlugins = jest.fn(() => []);
export const useLastUsedPluginId = jest.fn(() => undefined);
export const useLanguagesFilter = jest.fn(() => ['English']);
export const usePinnedPlugins = jest.fn(() => []);
export const usePluginActions = jest.fn(() => pluginActions);
