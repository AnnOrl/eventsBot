import axios from "axios";
import moment from "moment";
import {
  filterEvents,
  getEventsText,
  isThisWeekEvent,
  isTodayEvent,
  isTomorrowEvent,
  readFile,
  wait,
  writeActualFile,
} from "../utils.js";
moment.locale("ru");
import config from "../../config.json" assert { type: "json" };
import { sendMarkup, sendMessage } from "../tgApi.js";
import { getITicketEvents } from "./iTickets.js";
import { getAfishaEvents } from "./afisha.js";
import { getLifeticketsEvents } from "./lifetickets.js";
import { getTravels } from "./travel.js";

const periodDays = 180;

const getEvents = async () => {
  clearOldEvents();

  await axios({
    method: "get",
    url: encodeURI(
      `https://moldova.travel/ru/otkroite-dlea-sebia/meropriatia-i-festivali/`
    ),
  })
    .then(({ data }) => {
      return getTravels(data);
    })
    .catch((e) => {
      console.log("Ошибка получения обновлений", e);
    });

  const today = moment();
  for (let i = 0; i < periodDays; i++) {
    await wait();
    const date = moment(today).add(i, "days").hours(0).minutes(0).seconds(0);
    const formatDateIT = date.format("DD.MM.YYYY");
    const formatDateLT = date.format("YYYY-MM-DD");
    const formatDateMD = date.format("DD/MM/YYYY");

    await axios({
      method: "get",
      url: encodeURI(
        `https://iticket.md/ru/events?from=${formatDateIT}&to=${formatDateIT}&view=table`
      ),
    })
      .then((data) => getITicketEvents(data, date))
      .catch((e) => {
        console.log("Ошибка получения обновлений", e);
      });

    // await axios({
    //   method: "get",
    //   url: encodeURI(`https://afisha.md/ru/?date=` + date.valueOf()),
    // })
    //   .then((data) => {
    //     console.log(encodeURI(`https://afisha.md/ru/?date=` + date.valueOf()));
    //     return getAfishaEvents(data, date);
    //   })
    //   .catch((e) => {
    //     console.log("Ошибка получения обновлений", e);
    //   });

    await axios({
      method: "get",
      url: encodeURI(
        `https://api.livetickets.md/api/timetables?page=1&city=All&from=${formatDateLT}&to=${formatDateLT}`
      ),
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-language": "ru",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        Host: "api.livetickets.md",
        Origin: "https://livetickets.md",
        Pragma: "no-cache",
        Referer: "https://livetickets.md/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "X-API-KEY":
          "a2dOlfPITF63PnSpXVSdlPtiZZRVGf3BaNk4dgylRE3GMmJOrBjfXFvs5tGu",
        "sec-ch-ua":
          '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
      },
    })
      .then(({ data }) => getLifeticketsEvents(data?.data?.timetables, date))
      .catch((e) => {
        console.log("Ошибка получения обновлений", e);
      });
  }
};

const clearOldEvents = () => {
  const { events } = readFile("data/events.json");
  const actualEvents = {};

  Object.keys(events).forEach((key) => {
    const today = moment();

    if (!moment(events[key].date).isBefore(today, "day")) {
      actualEvents[key] = events[key];
    }
  });

  writeActualFile("data/events.json", "events", actualEvents);
};

const getTodayEvents = () => {
  const today = moment();
  const {
    everyDayAnnouncementDate = "",
    everyTomorrowAnnouncementDate = "",
    everyWeekAnnouncementDate = "",
  } = readFile("data/events.json");

  if (
    (!everyTomorrowAnnouncementDate ||
      !moment(everyTomorrowAnnouncementDate).isSame(today, "day")) &&
    today.hour() >= 18
  ) {
    const { text, isFound } = getEventsText(
      filterEvents(isTomorrowEvent),
      "завтра"
    );

    if (isFound) {
      sendMarkup(
        text,
        [
          [
            {
              text: "Опубликовать анонс",
              callback_data: "publishAnnouncement",
            },
          ],
        ],
        config.telegram.my_chat_id
      );
    }

    writeActualFile(
      "data/events.json",
      "everyDayAnnouncementDate",
      today.valueOf()
    );
  }
  if (
    (!everyDayAnnouncementDate ||
      !moment(everyDayAnnouncementDate).isSame(today, "day")) &&
    today.hour() >= 8
  ) {
    const { text, isFound } = getEventsText(
      filterEvents(isTodayEvent),
      "сегодня"
    );

    if (isFound) {
      sendMarkup(
        text,
        [
          [
            {
              text: "Опубликовать анонс",
              callback_data: "publishAnnouncement",
            },
          ],
        ],
        config.telegram.my_chat_id
      );
      // sendMessage(text, config.telegram.my_chat_id, {
      //   disable_web_page_preview: true,
      // });
    }

    writeActualFile(
      "data/events.json",
      "everyDayAnnouncementDate",
      today.valueOf()
    );
  }

  if (
    (!everyWeekAnnouncementDate ||
      (!moment(everyWeekAnnouncementDate).isSame(today, "week") &&
        today.weekday() === 0)) &&
    today.hour() >= 8
  ) {
    const { text, isFound } = getEventsText(
      filterEvents(isThisWeekEvent),
      "этой неделе"
    );

    if (isFound) {
      sendMarkup(
        text,
        [
          [
            {
              text: "Опубликовать анонс",
              callback_data: "publishAnnouncement",
            },
          ],
        ],
        config.telegram.my_chat_id
      );
      // sendMessage(text, config.telegram.my_chat_id, {
      //   disable_web_page_preview: true,
      // });
    }
    writeActualFile(
      "data/events.json",
      "everyWeekAnnouncementDate",
      today.valueOf()
    );
  }
};

export { getEvents, getTodayEvents };
