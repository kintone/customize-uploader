import fs from "fs";
import mkdirp from "mkdirp";
import { Lang } from "./lang";
import { getBoundMessage } from "./messages";

export interface InitCustomizeManifest {
  app: string;
  scope: "";
  desktop: {
    js: [];
    css: [];
  };
  mobile: {
    js: [];
  };
}

export const getInitCustomizeManifest = (
  appId: string
): InitCustomizeManifest => {
  return {
    app: appId,
    scope: "",
    desktop: {
      js: [],
      css: []
    },
    mobile: {
      js: []
    }
  };
};

export const generateCustomizeManifest = (
  customizeManifest: InitCustomizeManifest,
  destDir: string
): Promise<any> => {
  if (!fs.existsSync(`${destDir}`)) {
    mkdirp.sync(`${destDir}`);
  }
  return new Promise((resolve, reject) => {
    return fs.writeFile(
      `${destDir}/customize-manifest.json`,
      JSON.stringify(customizeManifest, null, 4),
      err => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.stringify(customizeManifest, null, 4));
        }
      }
    );
  });
};

export const runInit = async (
  appId: string,
  lang: Lang,
  destDir: string
): Promise<any> => {
  const m = getBoundMessage(lang);
  const customizeManifest = getInitCustomizeManifest(appId);
  await generateCustomizeManifest(customizeManifest, destDir);
  console.log(m("M_CommandInitFinish"));
};
