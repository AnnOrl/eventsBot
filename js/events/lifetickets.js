import axios from "axios";
import moment from "moment";
moment.locale("ru");

import jsdom from "jsdom";
const { JSDOM } = jsdom;

import { extractDateAndTimeLifetickets, readFile } from "../utils.js";
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

          let sameName = null;

          for (let k = 0; k < Object.keys(savedEvents).length; k++) {
            if (name === savedEvents[Object.keys(savedEvents)[k]].name) {
              sameName === Object.keys(savedEvents)[k];
              break;
            }
          }

          const text = dom.window.document.querySelector(
            "article[property=description]"
          ).textContent;
          const price = dom.window.document
            .querySelector("div[property=offers]")
            .textContent.replace(/\n/g, "")
            .replace(/  /g, "");
          const match = dom.window.document
            .querySelector("div[property=startDate]")
            .textContent.replace(/\n/g, "");

          const { dateStart, dateEnd, hEvent, mEvent, timeEvent, textDate } =
            extractDateAndTimeLifetickets(match);

          const location = dom.window.document
            .querySelector("div[typeof=Place] div[property=name]")
            .textContent.replace(/\n/g, "");

          await saveEvents(
            {
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
              dateStart,
              dateEnd,
              textDate,
            },
            sameName
          );
        });
      }
    }
  } catch (e) {
    console.log("ERROR", e);
  }
};

export { getLifeticketsEvents };
