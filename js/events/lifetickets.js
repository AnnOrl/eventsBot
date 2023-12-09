import axios from "axios";
import moment from "moment";
moment.locale("ru");

import jsdom from "jsdom";
const { JSDOM } = jsdom;

import {
  extractDateAndTimeLifetickets,
  getSameName,
  readFile,
} from "../utils.js";
moment.locale("ru");

import { saveEvents } from "./parseEvents.js";

const getLifeticketsEvents = async (data) => {
  try {

    const dom = new JSDOM(data);
    const links = dom.window.document.querySelectorAll(
      ".HomeEvents_list__60Hqd a"
    );
    console.log(
      "\nАнализ LifeTickets, ", links.length
    );
    for (let i = 0; i < links.length; i++) {
      const { events: savedEvents } = readFile("data/events.json");
      const { checkin = [] } = readFile("data/check.json");

      const linkHref = "https://livetickets.md" + links[i].href;

      if (!savedEvents[linkHref] && checkin.indexOf(linkHref) === -1) {
        console.log("Запрашиваю подробности");
        return await axios({
          method: "get",
          url: encodeURI(linkHref),
        }).then(async ({ data }) => {
          const dom = new JSDOM(data);
          const name =
            dom.window.document.querySelector("h1").innerHTML;
          const img = dom.window.document.querySelector(
            "img[alt=Banner]"
          ).src;

          const text = dom.window.document.querySelector(
            ".Event_description__LFTSE"
          ).textContent;
          const price = "";
          const match = dom.window.document
            .querySelector("h1 + p>span")
            .textContent.replace(/\n/g, "");

          const { dateStart, dateEnd, hEvent, mEvent, timeEvent, textDate } =
            extractDateAndTimeLifetickets(match) || {};

          const location = dom.window.document
            .querySelector("h1 + p span:last-child")
            .textContent.replace(/\n/g, "");

          await saveEvents(
            {
              img,
              name,
              price: price ? price : "",
              text,
              linkHref,
              date: dateStart,
              timeEvent,
              location,
              hEvent,
              mEvent,
              dateStart,
              dateEnd,
              textDate,
            },
            getSameName(name, savedEvents)
          );
        });
      }
    }
  } catch (e) {
    if (e.message === "401") {
      throw e;
    }
    console.log("ERROR", e);
  }
};

export { getLifeticketsEvents };
