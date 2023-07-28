import axios from "axios";
import moment from "moment";
moment.locale("ru");

import jsdom from "jsdom";
const { JSDOM } = jsdom;

import { readFile } from "../utils.js";
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
          // const dateEl = eventInfo
          //   .querySelector(".event__blk--period")
          //   .innerText.replaceAll("\n", " ");
          // console.log("dateEl '", dateEl, "'");
          // const regex = /(?:^|\s)0?(\d{1,2})(\S+)/;
          const regex = /(?:^|\s)0?(\d{1,2})(?:\s*-\s*\d{1,2})?\s*(\S+)/i;
          const dateMatch = dateEl.match(regex);

          const months = {
            января: "Jan",
            февраля: "Feb",
            марта: "Mar",
            апреля: "Apr",
            мая: "May",
            июня: "Jun",
            июля: "July",
            августа: "August",
            сентября: "Sep",
            октября: "October",
            ноября: "November",
            декабря: "December",
          };
          // console.log("dateMatch", dateMatch);

          const date = moment(
            Date.parse(
              `${dateMatch[1]} ${months[dateMatch[2]]} ${moment().year()}`
            )
          );

          const match = text.textContent?.match(/\b(\d{1,2}):(\d{2})\b/);
          const hEvent = (match && match[1]) || "";
          const mEvent = (match && match[2]) || "";
          const timeEvent = hEvent && mEvent ? hEvent + ":" + mEvent : "";
          await saveEvents({
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
          });
          needEncode = true;
        });
      }
    }
  } catch (e) {
    console.log("ERROR");
    if (needEncode) {
      needEncode = false;
      await getTravels(data);
    } else {
      needEncode = true;
    }
  }
};

export { getTravels };
