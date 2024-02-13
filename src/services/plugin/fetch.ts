import { getPlugin } from '@plugins/pluginManager';

export const fetchNovel = async (pluginId: string, novelPath: string) => {
  const plugin = getPlugin(pluginId);
  const res = await plugin.parseNovel(novelPath).catch(e => {
    throw e;
  });
  return res;
};

export const fetchImage = async (pluginId: string, imageUrl: string) => {
  return getPlugin(pluginId)
    .fetchImage(imageUrl)
    .catch(e => {
      throw e;
    });
};

export const fetchChapter = async (pluginId: string, chapterPath: string) => {
  const plugin = getPlugin(pluginId);
  let chapterText = `Not found plugin with id: ${pluginId}`;
  if (plugin) {
    chapterText = await plugin.parseChapter(chapterPath).catch(e => {
      throw e;
    });
  }
  return chapterText;
};

export const fetchChapters = async (pluginId: string, novelPath: string) => {
  const plugin = getPlugin(pluginId);
  const res = await plugin.parseNovel(novelPath).catch(e => {
    throw e;
  });

  const chapters = res.chapters;

  return chapters;
};

export const fetchPage = async (
  pluginId: string,
  novelPath: string,
  page: string,
) => {
  const plugin = getPlugin(pluginId);
  if (!plugin.parsePage) {
    throw new Error('Cant parse page!');
  }
  const res = await plugin.parsePage(novelPath, page).catch(e => {
    throw e;
  });
  return res;
};
