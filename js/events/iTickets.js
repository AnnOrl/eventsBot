import axios from "axios";
import moment from "moment";
moment.locale("ru");

import jsdom from "jsdom";
const { JSDOM } = jsdom;

import {
  extractDateAndTimeITickets,
  getSameName,
  readFile,
  waitOneMinute,
} from "../utils.js";
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
          const timeS = dom.window.document
            .querySelector(".date-time-location .time")
            .textContent.replace(/\n/g, "");

          const dateS = dom.window.document
            .querySelector(".date-time-location .date")
            .textContent.replace(/\n/g, "");

          const location = dom.window.document
            .querySelector(".date-time-location .location")
            .textContent.replace(/\n/g, "");

          const { dateStart, dateEnd, hEvent, mEvent, timeEvent, textDate } =
            extractDateAndTimeITickets(dateS + " " + timeS);

          await saveEvents(
            {
              img,
              name,
              price: price !== " лей" && price !== "  лей" ? price : "",
              text,
              linkHref,
              date,
              location,
              dateStart,
              dateEnd,
              hEvent,
              mEvent,
              timeEvent,
              textDate,
            },
            getSameName(name, savedEvents)
          );
        });
      }
    }
  } catch (e) {
    console.log("ERROR", e);
    await waitOneMinute();
  }
};

export { getITicketEvents };
