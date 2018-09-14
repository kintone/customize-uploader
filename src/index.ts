import chokidar from "chokidar";
import fs from "fs";
import KintoneApiClient, { AuthenticationError } from "./KintoneApiClient";
import { Lang } from "./lang";
import { getBoundMessage } from "./messages";
import { isUrlString, wait } from "./util";

export interface Option {
  watch?: string;
  lang: Lang;
  proxy: string;
  guestSpaceId: number;
}

interface CustomizeManifest {
  app: string;
  scope: "ALL" | "ADMIN" | "NONE";
  desktop: {
    js: string[];
    css: string[];
  };
  mobile: {
    js: string[];
  };
}

const RETRY_COUNT = 3;

async function upload(
  kintoneApiClient: KintoneApiClient,
  manifest: CustomizeManifest,
  status: {
    count: number;
    updateBody: any;
    updated: boolean;
    deployed: boolean;
  },
  options: Option
): Promise<void> {
  const m = getBoundMessage(options.lang);
  const appId = manifest.app;
  let { count, updateBody, updated, deployed } = status;

  try {
    if (!updateBody) {
      try {
        const [desktopJS, desktopCSS, mobileJS] = await Promise.all(
          [
            { files: manifest.desktop.js, type: "text/javascript" },
            { files: manifest.desktop.css, type: "text/css" },
            { files: manifest.mobile.js, type: "text/javascript" }
          ].map(({ files, type }) =>
            Promise.all(
              files.map((file: string) =>
                kintoneApiClient
                  .prepareCustomizeFile(file, type)
                  .then(result => {
                    console.log(`${file} ` + m("M_Uploaded"));
                    return result;
                  })
              )
            )
          )
        );
        updateBody = Object.assign({}, manifest, {
          desktop: {
            js: desktopJS,
            css: desktopCSS
          },
          mobile: {
            js: mobileJS
          }
        });
        console.log(m("M_FileUploaded"));
      } catch (e) {
        console.log(m("E_FileUploaded"));
        throw e;
      }
    }

    if (!updated) {
      try {
        await kintoneApiClient.updateCustomizeSetting(updateBody);
        console.log(m("M_Updated"));
        updated = true;
      } catch (e) {
        console.log(m("E_Updated"));
        throw e;
      }
    }

    if (!deployed) {
      try {
        await kintoneApiClient.deploySetting(appId);
        await kintoneApiClient.waitFinishingDeploy(appId, () =>
          console.log(m("M_Deploying"))
        );
        console.log(m("M_Deployed"));
        deployed = true;
      } catch (e) {
        console.log(m("E_Deployed"));
        throw e;
      }
    }
  } catch (e) {
    const isAuthenticationError = e instanceof AuthenticationError;
    count++;
    status = { count, updateBody, updated, deployed };
    if (isAuthenticationError) {
      console.log(m("E_Authentication"));
    } else if (count < RETRY_COUNT) {
      await wait(1000);
      console.log(m("E_Retry"));
      await upload(kintoneApiClient, manifest, status, options);
    } else {
      console.log(e.message);
    }
  }
}

export const run = async (
  domain: string,
  username: string,
  password: string,
  manifestFile: string,
  options: Option
): Promise<void> => {
  const m = getBoundMessage(options.lang);

  const manifest: CustomizeManifest = JSON.parse(
    fs.readFileSync(manifestFile, "utf8")
  );
  const status = {
    count: 0,
    updateBody: null,
    updated: false,
    deployed: false
  };

  const files = manifest.desktop.js
    .concat(manifest.desktop.css, manifest.mobile.js)
    .filter((fileOrPath: string) => !isUrlString(fileOrPath));

  const kintoneApiClient = new KintoneApiClient(
    username,
    password,
    domain,
    options
  );
  await upload(kintoneApiClient, manifest, status, options);

  if (options.watch) {
    const watcher = chokidar.watch(files, {
      // Avoid that multiple change events were fired depending on which OS or text editors you are using with
      // Note that there would be higher possibility to get errors if you set smaller value of 'stabilityThreshold'
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });
    console.log(m("M_Watching"));
    watcher.on("change", () =>
      upload(kintoneApiClient, manifest, status, options)
    );
  }
};
