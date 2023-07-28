import axios from "axios";
import moment from "moment";
moment.locale("ru");

import jsdom from "jsdom";
const { JSDOM } = jsdom;

import { readFile } from "../utils.js";
moment.locale("ru");

import { saveEvents } from "./parseEvents.js";

const getAfishaEvents = async ({ data }, date) => {
  console.log(data);
  const dom = new JSDOM(data);
  const links = dom.window.document.querySelectorAll(".events-card a");

  try {
    console.log(
      "\nАнализ AfishaMD, " + moment(date).format("DD MMMM"),
      links.length
    );
    console.log(dom.window.document.querySelectorAll("p"));
    for (let i = 0; i < links.length; i++) {
      const { events: savedEvents } = readFile("data/events.json");
      const { checkin = [] } = readFile("data/check.json");

      const linkHref = links[i].href;
      if (!savedEvents[linkHref] && checkin.indexOf(linkHref) === -1) {
        console.log("Запрашиваю подробности");
        await axios({
          method: "get",
          url: encodeURI(linkHref),
        }).then(async ({ data }) => {
          const dom = new JSDOM(data);
          const name = dom.window.document.querySelector(".eOWIPu").innerHTML;
          const img = dom.window.document.querySelector(".dxDuSn img").src;
          const text = dom.window.document.querySelector(".bdVcrM").textContent;
          const price = dom.window.document
            .querySelector(".cRekYi.text")
            .textContent.replace(/\n/g, "");
          const match = dom.window.document
            .querySelector(".sc-rj43u4-6 cRekYi.text")
            .textContent.replace(/\n/g, "")
            .match(/\b(\d{1,2}):(\d{2})\b/);
          const hEvent = (match && match[1]) || "";
          const mEvent = (match && match[2]) || "";
          const timeEvent = hEvent && mEvent ? hEvent + ":" + mEvent : "";
          const location = dom.window.document
            .querySelector(".cRekYi.text")
            .textContent.replace(/\n/g, "");

          saveEvents({
            img,
            name,
            price,
            text,
            linkHref,
            date,
            timeEvent,
            location,
            hEvent,
            mEvent,
          });
        });
      }
    }
  } catch (e) {
    console.log("ERROR", e);
  }
};

export { getAfishaEvents };
