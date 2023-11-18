// tunovelaligera.js
// This is a modified version of the original script from https://github.com/christmovies/lnreader/blob/b11626afd19477fe6c4434be5a2ad38b4276aa73/src/sources/es/tunovelaligera.js
// The changes are marked with // MODIFIED comments

// MODIFIED: Added the missing imports at the beginning of the script
import cheerio from "react-native-cheerio";
import { Status } from "../../helpers/constants";
import { parseDate } from "../../utils/parse-date";

const sourceId = 23;
const sourceName = "TuNovelaLigera";

const baseUrl = "https://tunovelaligera.com/";

const popularNovels = async (page) => {
    let totalPages = 1;
    let url = baseUrl + "novelas/page/" + page;

    const result = await fetch(url);
    const body = await result.text();

    $ = cheerio.load(body);

    let novels = [];

    $(".post-item").each(function (result) {
        const novelName = $(this).find(".post-title").text();
        const novelCover = $(this).find("img").attr("src");

        let novelUrl = $(this).find(".post-title > a").attr("href");
        novelUrl = novelUrl.replace(baseUrl + "novelas/", "");

        const novel = {
            sourceId,
            novelName,
            novelCover,
            novelUrl,
        };

        novels.push(novel);
    });

    if (page === 1) {
        totalPages = $(".pagination")
            .find(".last")
            .text()
            .trim();
    }

    return { totalPages, novels };
};

const parseNovelAndChapters = async (novelUrl) => {
    const url = baseUrl + "novelas/" + novelUrl;

    const result = await fetch(url);
    const body = await result.text();

    $ = cheerio.load(body);

    let novel = {};

    novel.sourceId = sourceId;

    novel.sourceName = sourceName;

    novel.url = url;

    novel.novelUrl = novelUrl;

    novel.novelName = $("h1").text();

    novel.novelCover =
        $(".summary_image > a > img").attr("data-src") ||
        $(".summary_image > a > img").attr("src");

    novel.summary =
        $(".description-summary > div.summary__content")
            .text()
            .trim() || "";

    // MODIFIED: Added a check for empty genres
    let genres = [];
    $(".genres-content > a").each(function () {
        const genreText = $(this).text().trim();
        if (genreText) {
            genres.push(genreText);
        }
    });
    
    // MODIFIED: Added a check for empty author
    let author;
    $(".author-content > a").each(function () {
        const authorText = $(this).text().trim();
        if (authorText) {
            author = authorText;
        }
    });

    // MODIFIED: Added a check for empty status
    let status;
    $(".status-content > a").each(function () {
        const statusText = $(this).text().trim();
        if (statusText) {
            status =
                statusText === "En curso"
                    ? Status.ONGOING
                    : statusText === "Finalizado"
                    ? Status.COMPLETED
                    : Status.UNKNOWN;
        }
    });

    // MODIFIED: Added the missing properties to the novel object
    novel.genre = genres.join(", ");
    novel.author = author;
    novel.status = status;

    let chapters = [];

    $(".wp-manga-chapter > a").each(function (result) {
        let chapterName;
        let releaseDate;
        let chapterUrl;

        chapterName = $(this).find(".chapter-name").text().trim();
        
        // MODIFIED: Added a check for empty release date
        releaseDate =
            $(this).find(".chapter-release-date > i").text().trim() || null;

        chapterUrl =
            $(this)
                .attr("href")
                .replace(url, "")
                .replace("/", "") || "";

        chapters.push({
            chapterName,
            releaseDate,
            chapterUrl,
        });
    });

    chapters.reverse();

    return { ...novel, chapters };
};

const parseChapterDetails = async (novelUrl, chapterUrl) => {
    
     // MODIFIED: Added the missing slash to the url
     const url =
         baseUrl + "novelas/" + novelUrl + "/" + chapterUrl + "/";

     const result = await fetch(url);
     const body = await result.text();

     $ = cheerio.load(body);

     let chapterName;
     let chapterText;

     chapterName = $(".text-left > h4").text().trim();

     chapterText = $(".reading-content").html();

     const chapter = {
         sourceId: sourceId,
         novelUrl: novelUrl,
         chapterUrl: chapterUrl,
         chapterName: chapterName,
         chapterText: chapterText,
     };

     return chapter;
};

const searchNovels = async (searchTerm) => {
    const searchUrl =
        baseUrl + "?s=" + searchTerm + "&post_type=wp-manga&author=&artist=&release=";

    const result = await fetch(searchUrl);
    const body = await result.text();

    $ = cheerio.load(body);

    let novels = [];

    $(".c-tabs-item__content").each(function (result) {
        const novelName = $(this).find(".h4 > a").text();
        const novelCover = $(this).find(".content-thumb > a > img").attr("src");

        let novelUrl = $(this).find(".h4 > a").attr("href");
        novelUrl = novelUrl.replace(baseUrl + "novelas/", "");

        const novel = {
            sourceId,
            novelName,
            novelCover,
            novelUrl,
        };

        novels.push(novel);
    });

    return novels;
};

const TuNovelaLigeraScraper = {
    popularNovels,
    parseNovelAndChapters,
    parseChapterDetails,
    searchNovels,
};

export default TuNovelaLigeraScraper;
