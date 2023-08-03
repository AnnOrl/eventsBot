import axios from "axios";
import moment from "moment";
moment.locale("ru");

import jsdom from "jsdom";
const { JSDOM } = jsdom;

import {
  extractDateAndTimeAfisha,
  extractDateAndTimeITickets,
  readFile,
} from "../utils.js";
moment.locale("ru");

import { saveEvents } from "./parseEvents.js";

const getAfishaEvents = async (events, date) => {
  try {
    console.log(
      "\nАнализ AfishaMD, " + moment(date).format("DD MMMM"),
      events.length
    );

    for (let i = 0; i < events.length; i++) {
      const { events: savedEvents } = readFile("data/events.json");
      const { checkin = [] } = readFile("data/check.json");

      const linkHref =
        "https://afisha.md/ru/events/" +
        events[i].parent[0].url +
        "/" +
        events[i].id +
        "/" +
        events[i].url;
      if (!savedEvents[linkHref] && checkin.indexOf(linkHref) === -1) {
        console.log("Запрашиваю подробности");
        await axios({
          method: "get",
          url: encodeURI(linkHref),
        }).then(async ({ data }) => {
          const dom = new JSDOM(data);
          const name = dom.window.document.querySelector(
            ".sc-d5tvfr-6.eOWIPu"
          ).innerHTML;
          const img = dom.window.document.querySelector(
            ".sc-jo6gyn-0.dxDuSn img"
          ).src;
          const text = dom.window.document.querySelector(
            ".sc-gf2pbu-0.bdVcrM"
          ).textContent;

          const allData = dom.window.document.querySelectorAll(
            ".sc-rj43u4-6.cRekYi.text"
          );
          const allIcon = dom.window.document.querySelectorAll(
            ".sc-rj43u4-6.cRekYi i"
          );
          let location, price, dateHtml;

          for (let j = 0; j < allIcon.length; j++) {
            switch (allIcon[j].classList[1]) {
              case "icon-buildings":
                location = allData[j].textContent.replace(/\n/g, "");
                break;
              case "icon-clock":
                dateHtml = allData[j].textContent;
                break;
              case "icon-ticket2":
                price = allData[j].textContent.replace(/\n/g, "");
                break;
            }
          }

          const { dateStart, dateEnd, hEvent, mEvent, timeEvent, textDate } =
            extractDateAndTimeAfisha(dateHtml || moment(date).format("D MMMM"));

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
