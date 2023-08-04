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
  clearOldCheckEvents();

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

    await axios({
      method: "post",
      url: encodeURI(`https://afisha.md/content_graphql`),
      data: {
        operationName: "Events",
        variables: {
          take: 18,
          visible: true,
          blocked: false,
          project_id: "75638b23-4652-46d4-a2d4-f097f278fd84",
          lang: "ru",
          parent_url: "",
          sort: "dates.schedule:asc",
          date_to: Number(
            (moment(date).add(1439, "minutes").valueOf() + "").slice(0, -3)
          ),
          date_from: Number((date.valueOf() + "").slice(0, -3)),
        },
        query:
          'query Events($project_id: String!, $date_from: Int, $date_to: Int, $visible: Boolean, $blocked: Boolean, $expired: Boolean, $stopped: Boolean, $sort: String, $take: Int, $skip: Int, $lang: String, $parent_url: String, $date: String, $keyword: String) {\n  events(project_id: $project_id, date_from: $date_from, date_to: $date_to, visible: $visible, blocked: $blocked, expired: $expired, stopped: $stopped, sort: $sort, take: $take, skip: $skip, parent_url: $parent_url, date: $date, keyword: $keyword) {\n    dates {\n      soon\n      schedule {\n        dates(format: "2 $$January$$, 15:04", lang: $lang)\n        datesTS: dates\n        __typename\n      }\n      __typename\n    }\n    id\n    type\n    url\n    kinopoisk\n    title {\n      ru\n      ro\n      __typename\n    }\n    cover\n    banner {\n      image\n      __typename\n    }\n    ratio {\n      kinopoisk\n      imdb\n      __typename\n    }\n    ticketEvents: ticket_events {\n      ticketDates: ticket_dates {\n        price\n        __typename\n      }\n      __typename\n    }\n    parent {\n      id\n      title {\n        ru\n        ro\n        __typename\n      }\n      url\n      type\n      __typename\n    }\n    place {\n      id\n      title {\n        ru\n        ro\n        __typename\n      }\n      url\n      parent {\n        id\n        type\n        url\n        __typename\n      }\n      __typename\n    }\n    tags\n    __typename\n  }\n}\n',
      },
    })
      .then(({ data }) =>
        data?.data?.events ? getAfishaEvents(data?.data?.events, date) : null
      )
      .catch((e) => {
        console.log("Ошибка получения обновлений", e);
      });

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
const clearOldCheckEvents = () => {
  const { events } = readFile("data/check.json");
  const actualEvents = {};

  Object.keys(events).forEach((key) => {
    const today = moment();

    if (!moment(events[key].date).isBefore(today, "day")) {
      actualEvents[key] = events[key];
    }
  });

  writeActualFile("data/check.json", "events", actualEvents);
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
      "everyTomorrowAnnouncementDate",
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
