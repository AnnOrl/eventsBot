import pkg from "lodash";
const { isEmpty, set, sortBy } = pkg;
import { editMessageText, sendMessage } from "./tgApi.js";
import {
  filterEvents,
  getEventsText,
  isNextWeekEvent,
  isThisWeekEvent,
  isTodayEvent,
  isTomorrowEvent,
  readFile,
  writeActualFile,
} from "./utils.js";
import moment from "moment";
import config from "../config.json" assert { type: "json" };
import { chatGPTRequest, sendCheckEvent } from "./events/chatGPT.js";
import { getTodayFilmsEvent } from "./events/getEvents.js";

moment.locale("ru");

const findEvents = async (message, eventsByDate, filterName) => {
  const {
    message_id,
    chat: { id },
  } = await sendMessage(`Ищу события на ${filterName}...`, message.from.id, {
    disable_web_page_preview: true,
  });

  editMessageText(
    getEventsText(eventsByDate, filterName).text,
    id,
    message_id,
    null,
    {
      disable_web_page_preview: true,
    }
  );
};
const newCommand = async (message) => {
  if (message.from.id !== +config.telegram.my_chat_id) {
    return;
  }

  try {
    const body = message.text.replace("/newpost ", "").replace("\n", "");

    const {
      img = "",
      name = "",
      price = "",
      text = "",
      postText = "",
      linkHref = "",
      date = "",
      timeEvent = "",
      location = "",
      dateStart = "",
      dateEnd = "",
      textDate = "",
    } = JSON.parse(body);

    let check_message_id, resText;

    if (postText) {
      const { message_id } = await sendCheckEvent(
        img,
        '',
        postText,
        linkHref
      );

      check_message_id = message_id;
      resText = postText
    } else {
      const { message_id, text } =
        await chatGPTRequest({
          img,
          name,
          price,
          text,
          linkHref,
          date,
          timeEvent,
          location,
          dateStart,
          dateEnd,
          textDate,
        });
      check_message_id = message_id;
      resText = text;
    }

    const { events: savedEvents } = readFile("data/check.json");
    let newEvents = { ...savedEvents };
    const [h, m] = timeEvent ? timeEvent.split(':') : [0, 0];

    newEvents[check_message_id] = {
      img,
      name,
      price,
      date: moment(new Date(date)).hours(h).minutes(m).seconds("00").valueOf(),
      check_message_id,
      location,
      linkHref,
      postText,
      dateStart,
      dateEnd,
      timeEvent,
      textDate: textDate || date,
    };

    writeActualFile("data/check.json", "events", newEvents);
  } catch (e) {
    console.log("не удалось определить тело запроса", e);
    sendMessage(
      `Не удалось, попробуйте использовать следующий шаблон "{
        "img": "https://api.livetickets.md/storage/shows/2745/conversions/slide.jpg",
        "name": "Фестиваль пчел",
        "price": "",
        "text": "Добро пожаловать на фестиваль пчел",
        "linkHref": "",
        "date": "09-09-2023",
        "timeEvent": "10:00",
        "location": "центр",
        "dateStart": "09-09",
        "dateEnd": "10-09",
        "textDate": "9-10 сентября"
      }"`,
      message.from.id,
      {
        disable_web_page_preview: true,
      }
    );
  }
};

const reloadCommand = async (message) => {
  if (message.from.id !== +config.telegram.my_chat_id) {
    return;
  }
  writeActualFile("data/check.json", "events", {});

  writeActualFile(
    "data/check.json",
    "checkin",
    []
  );
  sendMessage(
    `История очищена`,
    message.from.id,
    {
      disable_web_page_preview: true,
    }
  );
};

const todayCommand = async (message) => {
  findEvents(message, filterEvents(isTodayEvent), "сегодня");
};

const tomorrowCommand = async (message) => {
  findEvents(message, filterEvents(isTomorrowEvent), "завтра");
};
const thisweekCommand = async (message) => {
  findEvents(message, filterEvents(isThisWeekEvent), "этой неделе");
};

const nextweekCommand = async (message) => {
  findEvents(message, filterEvents(isNextWeekEvent), "следующей неделе");
};

const commands = {
  "/today": todayCommand,
  "/tomorrow": tomorrowCommand,
  "/thisweek": thisweekCommand,
  "/nextweek": nextweekCommand,
  "/films": getTodayFilmsEvent,
  "/newpost": newCommand,
  "/reload": reloadCommand,
};

export { commands };
