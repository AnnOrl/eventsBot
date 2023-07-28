import axios from "axios";
import moment from "moment";
moment.locale("ru");

import jsdom from "jsdom";
const { JSDOM } = jsdom;

import { extractDateAndTimeAfisha, readFile } from "../utils.js";
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

          const allData = dom.window.document.querySelectorAll(
            ".sc-rj43u4-6.cRekYi.text"
          );
          const location = allData[0].textContent.replace(/\n/g, "");
          const price = allData[4].textContent.replace(/\n/g, "");

          const { dateStart, dateEnd, hEvent, mEvent, timeEvent, textDate } =
            extractDateAndTimeITickets(allData[2].textContent);

          saveEvents({
            img,
            name,
            price,
            text,
            linkHref,
            date,
            textDate,
            timeEvent,
            location,
            hEvent,
            mEvent,
            dateStart,
            dateEnd,
          });
        });
      }
    }
  } catch (e) {
    console.log("ERROR", e);
  }
};

export { getAfishaEvents };
