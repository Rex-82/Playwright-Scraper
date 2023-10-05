// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, log, Dataset } from "crawlee";
import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";

import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const outputFolder = path.join(__dirname, "..", "storage/output");

const code = 172;

chromium.use(stealthPlugin());

const crawler = new PlaywrightCrawler({
  requestHandlerTimeoutSecs: 600,
  // maxRequestRetries: 2,
  // browserPoolOptions: {
  //   useFingerprints: false,
  // },
  launchContext: {
    // !!! You need to specify this option to tell Crawlee to use puppeteer-extra as the launcher !!!
    launcher: chromium,
    launchOptions: {
      // Other puppeteer options work as usual
      headless: false,
    },
  },
  async requestHandler({ page }) {
    // This function is called to extract data from a single web page
    // 'page' is an instance of Playwright.Page with page.goto(request.url) already called
    // 'request' is an instance of Request class with information about the page to load
    await page.waitForTimeout(3000);
    const selProvElements = await page.$$("a.sel-prov");
    console.log("There are ", selProvElements.length, " Provinces");
    for (let index = 0; index < selProvElements.length; index++) {
      const element = selProvElements[index];
      const nameProv = await element.$eval(
        ".name-prov",
        (el: any) => el.textContent
      );
      console.log(`Elemento ${index + 1}:`, " (Index: ", index, ")");
      console.log(`Provincia: ${nameProv}`);
      console.log("");
      await element.click();
      await page.waitForTimeout(200);
      // await page.waitForSelector("a.cel-allevatore");
      let selAllevElements = await page.$$("a.cel-allevatore");
      let allevatori = await element.$eval(
        ".count-all",
        (el: any) => el.textContent
      );
      console.log(`Trovati  ${allevatori} allevatori`);
      let subIndex = 0;
      let cardNumber = 0;

      while (subIndex < selAllevElements.length) {
        // console.log(`-- subIndex: ${subIndex} --`)
        let fileIndex = subIndex + 1;

        if (cardNumber != 0) {
          // console.log(`-- subIndex(secondPage): ${subIndex} --`);
          fileIndex = subIndex + cardNumber * 20 + 1;
        }

        let filename = path.join(
          outputFolder,
          `output_${code}_${index + 1}_${fileIndex}.json`
        );

        if (!fs.existsSync(filename)) {
          console.log("Scraping element: ", fileIndex);

          const waitForResponse = page.waitForResponse((response) => {
            return response
              .url()
              .includes("umbraco/enci/AllevatoriApi/TakeAllevatore?idAffisso=");
          });

          await selAllevElements[subIndex].click();
          const jsonData = await waitForResponse;
          const jsonResponse = await jsonData.json();

          fs.writeFileSync(filename, JSON.stringify(jsonResponse, null, 2));
          filename = path.join(
            outputFolder,
            `output_${code}_${index + 1}_${subIndex + 1}.json`
          );

          console.log(
            "File saved with name: ",
            `output_${code}_${index + 1}_${subIndex + 1}.json`
          );

          await page.waitForSelector("button.close");
          const close = await page.$("button.close");

          close && (await close.click());

          await page.waitForTimeout(500);

          if (subIndex >= 19) {
            
            // console.log("subIndex maggiore-uguale a 19: ", subIndex)
            await page.waitForTimeout(500);
            const nextButton = await page.$(
              "ul.pagination li.ng-scope.active + li:not(.disabled) a"
            );

            if (nextButton) {
              // console.log("click");
              await nextButton.click();
              await page.waitForTimeout(500);
              selAllevElements = await page.$$("a.cel-allevatore");
              subIndex = -1;
              cardNumber++;
            }
          }
        } else {
          console.log("File already present, skipping...");
        }

        subIndex++;
      }
      console.log("----------------------");
      // await page.waitForSelector("body");
      // await page.waitForTimeout(10000);
    }
  },
  async failedRequestHandler({ request }) {
    // This function is called when the crawling of a request failed too many times
    await Dataset.pushData({
      url: request.url,
      succeeded: false,
      errors: request.errorMessages,
    });
  },
});

log.info("Starting the crawl.");

await crawler.run([
  `https://www.enci.it/allevatori/allevatori-con-affisso?idRazzaFci=${code}`,
]);

log.info("Crawl finished.");
