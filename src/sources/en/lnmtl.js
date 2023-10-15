import * as cheerio from 'cheerio';
import { showToast } from '../../hooks/showToast';

const baseUrl = 'https://lnmtl.com/';

const popularNovels = async page => {
  let url = baseUrl + 'novel?page=' + page;

  const result = await fetch(url);
  const body = await result.text();

  const loadedCheerio = cheerio.load(body);

  let novels = [];

  loadedCheerio('.media').each(function () {
    const novelName = loadedCheerio(this).find('h4').text();
    const novelCover = loadedCheerio(this).find('img').attr('src');

    let novelUrl = loadedCheerio(this).find('h4 > a').attr('href');
    novelUrl = novelUrl.replace(baseUrl + 'novel/', '');

    const novel = {
      sourceId: 37,
      novelName,
      novelCover,
      novelUrl,
    };

    novels.push(novel);
  });

  return { novels };
};

const parseNovelAndChapters = async novelUrl => {
  showToast('LNMTL might take around 20-30 seconds.');

  const url = baseUrl + 'novel/' + novelUrl;

  const result = await fetch(url);
  const body = await result.text();

  const loadedCheerio = cheerio.load(body);

  let novel = {};

  novel.sourceId = 37;

  novel.sourceName = 'LNMTL';

  novel.url = url;

  novel.novelUrl = novelUrl;

  novel.novelName = loadedCheerio('.novel-name').text();

  novel.novelCover = loadedCheerio('.novel').find('img').attr('src');

  novel.summary = loadedCheerio('.description').text().trim();

  loadedCheerio('.panel-body > dl').each(function () {
    let detailName = loadedCheerio(this).find('dt').text().trim();
    let detail = loadedCheerio(this).find('dd').text().trim();

    switch (detailName) {
      case 'Authors':
        novel.author = detail;
        break;
      case 'Current status':
        novel.status = detail;
        break;
    }
  });

  novel.genre = loadedCheerio('.panel-heading:contains(" Genres ")')
    .next()
    .text()
    .trim()
    .replace(/\s\s/g, ',');

  let volumes = JSON.parse(
    loadedCheerio('main')
      .next()
      .html()
      .match(/lnmtl.volumes = \[(.*?)\]/)[0]
      .replace('lnmtl.volumes = ', ''),
  );

  let chapters = [];

  volumes = volumes.map(volume => volume.id);

  for (const volume of volumes) {
    let volumeData = await fetch(
      `https://lnmtl.com/chapter?page=1&volumeId=${volume}`,
    );
    volumeData = await volumeData.json();

    // volumeData = volumeData.data.map((volume) => volume.slug);

    for (let i = 1; i <= volumeData.last_page; i++) {
      let chapterData = await fetch(
        `https://lnmtl.com/chapter?page=${i}&volumeId=${volume}`,
      );
      chapterData = await chapterData.json();

      chapterData = chapterData.data.map(chapter => ({
        chapterName: `#${chapter.number} ${chapter.title}`,
        chapterUrl: chapter.slug,
        releaseDate: chapter.created_at,
      }));

      chapters.push(...chapterData);
    }
  }

  novel.chapters = chapters;

  return novel;
};

const parseChapter = async (novelUrl, chapterUrl) => {
  const url = `${baseUrl}chapter/${chapterUrl}`;

  const result = await fetch(url);
  const body = await result.text();

  const loadedCheerio = cheerio.load(body);

  let chapterName = loadedCheerio('h3 > span.chapter-title').text().trim();

  loadedCheerio('.original, script').remove();
  loadedCheerio('sentence.translated').wrap('<p></p>');

  let chapterText = loadedCheerio('.chapter-body').html().replace(/„/g, '“');

  if (!chapterText) {
    chapterText = loadedCheerio('.alert.alert-warning').text();
  }

  const chapter = {
    sourceId: 37,
    novelUrl,
    chapterUrl,
    chapterName,
    chapterText,
  };

  return chapter;
};

const searchNovels = async searchTerm => {
  const result = await fetch(baseUrl);
  const body = await result.text();

  const loadedCheerio = cheerio.load(body);

  const list = loadedCheerio('footer')
    .next()
    .next()
    .html()
    .match(/prefetch: '\/(.*json)/)[1];

  const search = await fetch(`${baseUrl}${list}`);
  const data = await search.json();

  let nov = data.filter(res =>
    res.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const novels = [];

  nov.map(res => {
    const novelName = res.name;
    const novelUrl = res.slug;
    const novelCover = res.image;

    const novel = { sourceId: 37, novelName, novelUrl, novelCover };

    novels.push(novel);
  });

  return novels;
};

const LNMTLScraper = {
  popularNovels,
  parseNovelAndChapters,
  parseChapter,
  searchNovels,
};

export default LNMTLScraper;
