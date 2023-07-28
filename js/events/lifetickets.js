import axios from "axios";
import moment from "moment";
moment.locale("ru");

import jsdom from "jsdom";
const { JSDOM } = jsdom;

import { readFile } from "../utils.js";
moment.locale("ru");

import { saveEvents } from "./parseEvents.js";

const getLifeticketsEvents = async ({ data }, date) => {
  try {
    console.log(
      "\nАнализ LifeTickets, " + moment(date).format("DD MMMM"),
      data.length
    );
    for (let i = 0; i < data.length; i++) {
      const { events: savedEvents } = readFile("data/events.json");
      const { checkin = [] } = readFile("data/check.json");

      const linkHref = "https://livetickets.md" + data[i].link;

      if (!savedEvents[linkHref] && checkin.indexOf(linkHref) === -1) {
        console.log("Запрашиваю подробности");
        return await axios({
          method: "get",
          url: encodeURI(linkHref),
        }).then(async ({ data }) => {
          const dom = new JSDOM(data);
          const name =
            dom.window.document.querySelector(".event-info h1").innerHTML;
          const img = dom.window.document.querySelector(
            "picture[typeof=ImageObject] img"
          ).src;
          const text = dom.window.document.querySelector(
            "article[property=description]"
          ).textContent;
          const price = dom.window.document
            .querySelector("div[property=offers]")
            .textContent.replace(/\n/g, "")
            .replace(/  /g, "");
          const match = dom.window.document
            .querySelector("div[property=startDate]")
            .textContent.replace(/\n/g, "")
            .match(/\b(\d{1,2}):(\d{2})\b/);
          const hEvent = (match && match[1]) || "";
          const mEvent = (match && match[2]) || "";
          const timeEvent = hEvent && mEvent ? hEvent + ":" + mEvent : "";
          const location = dom.window.document
            .querySelector("div[typeof=Place] div[property=name]")
            .textContent.replace(/\n/g, "");

          await saveEvents({
            img,
            name,
            price: price ? price : "",
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

export { getLifeticketsEvents };
