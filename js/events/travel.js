import axios from "axios";
import moment from "moment";
moment.locale("ru");

import jsdom from "jsdom";
const { JSDOM } = jsdom;

import { extractDateAndTimeTravel, readFile, getSameName } from "../utils.js";
moment.locale("ru");

import { saveEvents } from "./parseEvents.js";

let needEncode = true;

const getTravels = async (data) => {
  const dom = new JSDOM(data);
  const links = dom.window.document.querySelectorAll(
    "#allEvents > section:first-child.related-events .event__blk-title a"
  );
  const eventsInfo = dom.window.document.querySelectorAll(".event__blk");
  console.log("\nАнализ Travels, ", links.length);
  try {
    for (let i = 0; i < links.length; i++) {
      const eventInfo = eventsInfo[i];

      const { events: savedEvents } = readFile("data/events.json");
      const { checkin = [] } = readFile("data/check.json");
      const linkHref = links[i].href;
      if (!savedEvents[linkHref] && checkin.indexOf(linkHref) === -1) {
        console.log("Запрашиваю подробности ", links[i].href, needEncode);
        await axios({
          method: "get",
          url: needEncode ? encodeURI(linkHref) : linkHref,
        }).then(async ({ data }) => {
          const dom = new JSDOM(data);
          const name = dom.window.document
            .querySelector(".page-title .container h1")
            .innerHTML.replace(/\n/g, "")
            .replace(/  /g, "");

          const img =
            dom.window.document
              .querySelector(".event__carousel .carousel-item.active img")
              ?.getAttribute("data-src") ||
            dom.window.document
              .querySelector(".event-featured-image")
              .getAttribute("data-bg");

          const text = dom.window.document.querySelector(
            ".event-description__cols"
          );

          const location = eventInfo.getAttribute("data-address");

          const dateEl = eventInfo
            .querySelector(".event__blk--period")
            .textContent.replaceAll(" ", "")
            .replaceAll("\n", "");
          const { dateStart, dateEnd, textDate } =
            extractDateAndTimeTravel(dateEl);

          const date = moment(Date.parse(`${dateStart}-${moment().year()}`));

          const match = text.textContent?.match(/\b(\d{1,2}):(\d{2})\b/);
          const hEvent = (match && match[1]) || "";
          const mEvent = (match && match[2]) || "";
          const timeEvent = hEvent && mEvent ? hEvent + ":" + mEvent : "";

          await saveEvents(
            {
              img,
              name,
              price: "",
              text: text.textContent,
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
            getSameName(name, savedEvents)
          );
          needEncode = true;
        });
      }
    }
  } catch (e) {
    console.log("ERROR", e);
    if (needEncode) {
      needEncode = false;
      await getTravels(data);
    } else {
      needEncode = true;
    }
  }
};

export { getTravels };
