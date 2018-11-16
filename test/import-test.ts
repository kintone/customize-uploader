import assert from "assert";
import * as fs from "fs";
import {
  ImportCustomizeManifest,
  importCustomizeSetting,
  Option
} from "../src/import";
import MockKintoneApiClient from "./MockKintoneApiClient";

describe("import", () => {
  const testDestDir = "testDestDir";
  const expectedDownloadFiles = [
    `${testDestDir}/customize-manifest.json`,
    `${testDestDir}/desktop/js/bootstrap.min.js`,
    `${testDestDir}/desktop/js/a.js`,
    `${testDestDir}/desktop/css/bootstrap.min.css`,
    `${testDestDir}/desktop/css/bootstrap-reboot.min.css`,
    `${testDestDir}/desktop/css/bootstrap-grid.min.css`,
    `${testDestDir}/mobile/js/bootstrap.js`,
    `${testDestDir}/mobile/js/b.js`
  ];

  const expectedGenerateDirs = [
    `${testDestDir}/desktop/js`,
    `${testDestDir}/desktop/css`,
    `${testDestDir}/desktop`,
    `${testDestDir}/mobile/js`,
    `${testDestDir}/mobile`,
    `${testDestDir}`
  ];

  describe("runImport", () => {
    let kintoneApiClient: MockKintoneApiClient;
    let manifest: ImportCustomizeManifest;
    let status: { retryCount: number };
    let options: Option;
    beforeEach(async () => {
      kintoneApiClient = new MockKintoneApiClient(
        "kintone",
        "hogehoge",
        "basicAuthUser",
        "basicAuthPass",
        "example.com",
        {
          proxy: "",
          guestSpaceId: 0
        }
      );
      manifest = {
        app: "1"
      };
      status = {
        retryCount: 0
      };
      options = {
        lang: "en",
        proxy: "",
        guestSpaceId: 0,
        destDir: testDestDir
      };
    });

    afterEach(() => {
      expectedDownloadFiles.forEach(path => fs.unlinkSync(path));
      expectedGenerateDirs.forEach(dir => fs.rmdirSync(dir));
    });

    it("should success generate customize-manifest.json and download uploaded js/css files", async () => {
      const fileBody = `
      (function() {
        console.log("hello");
      )();`;
      const getAppCustomizeResponse = JSON.parse(
        fs
          .readFileSync("test/fixtures/get-appcustomize-response.json")
          .toString()
      );
      kintoneApiClient.willBeReturn("/k/v1/file.json", "GET", fileBody);
      kintoneApiClient.willBeReturn(
        "/k/v1/app/customize.json",
        "GET",
        getAppCustomizeResponse
      );
      await importCustomizeSetting(kintoneApiClient, manifest, status, options);
      await fs.readFile(
        `${testDestDir}/customize-manifest.json`,
        async (err, buffer) => {
          const appCustomize = {
            app: "1",
            scope: "ALL",
            desktop: {
              js: [
                "https://js.cybozu.com/vuejs/v2.5.17/vue.min.js",
                "https://js.cybozu.com/lodash/4.17.11/lodash.min.js",
                `${testDestDir}/desktop/js/bootstrap.min.js`,
                `${testDestDir}/desktop/js/a.js`
              ],
              css: [
                `${testDestDir}/desktop/css/bootstrap.min.css`,
                `${testDestDir}/desktop/css/bootstrap-reboot.min.css`,
                `${testDestDir}/desktop/css/bootstrap-grid.min.css`
              ]
            },
            mobile: {
              js: [
                "https://js.cybozu.com/jquery/3.3.1/jquery.min.js",
                "https://js.cybozu.com/jqueryui/1.12.1/jquery-ui.min.js",
                `${testDestDir}/mobile/js/bootstrap.js`,
                `${testDestDir}/mobile/js/b.js`
              ]
            }
          };
          assert.deepStrictEqual(JSON.parse(buffer.toString()), appCustomize);
          const excludeManifest = expectedDownloadFiles.filter(
            file => !file.endsWith("customize-manifest.json")
          );
          excludeManifest.forEach(path => {
            assert.ok(fs.existsSync(path), `${path} should be exists`);
            assert.strictEqual(
              fs.readFileSync(path).toString(),
              fileBody,
              `file is correct(${path})`
            );
          });
        }
      );
    });
  });
});
