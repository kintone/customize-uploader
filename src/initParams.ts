import * as inquirer from "inquirer";
import { Lang } from "./lang";
import { getBoundMessage } from "./messages";

export const inquireInitParams = (lang: Lang) => {
  const appId: string = "";
  const m = getBoundMessage(lang);
  const questions = [
    {
      type: "input",
      message: m("Q_AppId"),
      name: "appId",
      validate: (v: string) => !!v
    }
  ];

  return inquirer
    .prompt(questions)
    .then(answers => Object.assign({ appId, lang }, answers));
};
