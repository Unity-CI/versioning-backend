import { getDocumentFromUrl } from '../utils/get-document-from-url';
import { EditorVersionInfo } from '../../model/editorVersionInfo';

const UNITY_ARCHIVE_URL = 'https://unity3d.com/get-unity/download/archive';
const UNITY_BETA_URL = 'https://unity3d.com/beta';

/**
 * Based on https://github.com/BLaZeKiLL/unity-scraper
 */
export const scrapeVersions = async (): Promise<EditorVersionInfo[]> => {
  const document = await getDocumentFromUrl(UNITY_ARCHIVE_URL);

  const links = Array.from(document.querySelectorAll('a.unityhub[href]'));
  const hrefs = links.map((a) => a.getAttribute('href')) as string[];

  const versionInfoList = hrefs.concat(await scrapeBetaVersions()).map((href) => {
    const info = href.replace('unityhub://', '');
    const [version, changeSet] = info.split('/');
    const [major, minor, patch] = version.split('.');

    return {
      version,
      changeSet,
      major: Number(major),
      minor: Number(minor),
      patch,
    };
  });

  return versionInfoList;
};

/**
 * Scrape available alpha/beta versions from https://unity3d.com/beta
 */
const scrapeBetaVersions = async (): Promise<string[]> => {
  const document = await getDocumentFromUrl(UNITY_BETA_URL);

  const betas = new Set<string>();
  Array.from(document.querySelectorAll('a[href]'))
    .map((a) => a.getAttribute('href') as string)
    .filter((href) => /^\/(alpha|beta)\/\d{4}\.\d(a|b)$/.test(href))
    .forEach((href) => betas.add(href));

  const downloads = new Set<string>();
  for (const beta of betas) {
    // [beta page] e.g. 'https://unity3d.com/beta/2020.2b'
    const betaPage = await getDocumentFromUrl(`https://unity3d.com${beta}`);
    Array.from(betaPage.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') as string)
      // [filter] e.g. '/unity/beta/2020.2.0b13'
      .filter((href) => /^\/unity\/(alpha|beta)\/\d{4}\.\d+\.\d+(a|b)\d+$/.test(href))
      .forEach((href) => downloads.add(href));
  }

  const hrefs = new Set<string>();
  for (const download of downloads) {
    // [download page] e.g. https://unity3d.com/unity/beta/2020.2.0b13
    const downloadPage = await getDocumentFromUrl(`https://unity3d.com${download}`);
    Array.from(downloadPage.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') as string)
      // [filter] e.g. 'unityhub://2020.2.0b13/655e1a328b90'
      .filter((href) => /^unityhub:\/\/\d{4}\.\d+\.\d+(a|b)\d+\/\w{12}$/.test(href))
      .forEach((href) => hrefs.add(href));
  }

  return Array.from(hrefs);
};