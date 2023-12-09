import axios from "axios";
import moment from "moment";
moment.locale("ru");

import config from "../config.json" assert { type: "json" };
import { actions } from "./actions.js";
import { commands } from "./commands.js";
import { writeActualFile, readFile } from "./utils.js";

var twirlTimer = () => {
  var P = ["\\", "|", "/", "-"];
  var x = 0;
  return setInterval(function () {
    process.stdout.write("\rWait " + P[x++]);
    x &= 3;
  }, 250);
};

const getUpdates = () => {
  let log = readFile("data/main.json");
  axios({
    method: "post",
    url: encodeURI(`${config.apiTG}${config.telegram.token}/getUpdates`),
    data: {
      ...(log.offset ? { offset: log.offset } : {}),
    },
  })
    .then(({ data }) => {
      const { result } = data;
      // twirlTimer();
      if (result.length > 0) {
        console.log("newUpdates", result);
        for (let i = 0; i < result.length; i++) {
          const { callback_query, message } = result[i];
          if (callback_query) {
            const action = callback_query.data.split("|")[0];
            actions[action] && actions[action](callback_query);
          } else if (message && message.text) {
            const command = message.text.split(" ")[0];
            commands[command] && commands[command](message);
          }
        }

        writeActualFile(
          "data/main.json",
          "offset",
          result[result.length - 1].update_id + 1
        );
      }
    })
    .catch((e) => {
      console.log("Ошибка получения обновлений", e);
    });
};

export { getUpdates };
