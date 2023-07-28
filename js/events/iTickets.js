import axios from "axios";
import moment from "moment";
moment.locale("ru");

import jsdom from "jsdom";
const { JSDOM } = jsdom;

import { readFile, waitOneMinute } from "../utils.js";
moment.locale("ru");

import { saveEvents } from "./parseEvents.js";

const getITicketEvents = async ({ data }, date) => {
  const dom = new JSDOM(data);
  const links = dom.window.document.querySelectorAll(
    ".new-filter-results tr>td a"
  );

  try {
    console.log(
      "\nАнализ iTickets, " + moment(date).format("DD MMMM"),
      links.length
    );
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
          const name =
            dom.window.document.querySelector(".title_event_name").innerHTML;
          const img =
            dom.window.document.querySelector(".main_img_item img").src;
          const text = dom.window.document.querySelector(
            ".container .txt_content"
          ).textContent;
          const price = dom.window.document
            .querySelector(".price_title")
            .textContent.replace(/\n/g, "");
          const match = dom.window.document
            .querySelector(".date-time-location .time")
            .textContent.replace(/\n/g, "")
            .match(/\b(\d{1,2}):(\d{2})\b/);
          const hEvent = (match && match[1]) || "";
          const mEvent = (match && match[2]) || "";
          const timeEvent = hEvent && mEvent ? hEvent + ":" + mEvent : "";
          const location = dom.window.document
            .querySelector(".date-time-location .location")
            .textContent.replace(/\n/g, "");

          await saveEvents({
            img,
            name,
            price: price !== " лей" && price !== "  лей" ? price : "",
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
    await waitOneMinute();
  }
};

export { getITicketEvents };
