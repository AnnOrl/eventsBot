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
import { chatGPTRequest } from "./events/chatGPT.js";

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
  //{
  // img,
  // name,
  // price,
  // text,
  // linkHref,
  // filterDate,
  // timeEvent,
  // location
  //}

  try {
    const body = message.text.replace("/newpost ", "").replace("\n", "");
    console.log("newCommand try", body);
    const {
      img = "",
      name = "",
      price = "",
      text = "",
      linkHref = "",
      date = "",
      timeEvent = "",
      location = "",
    } = JSON.parse(body);

    const { message_id: check_message_id, text: postText } =
      await chatGPTRequest(
        img,
        name,
        price,
        text,
        linkHref,
        date,
        timeEvent,
        location
      );
    const { events: savedEvents } = readFile("data/check.json");
    let newEvents = { ...savedEvents };

    newEvents[check_message_id] = {
      img,
      name,
      price,
      date: moment(new Date(date)).hours(0).minutes(0).seconds("00").valueOf(),
      check_message_id,
      location,
      linkHref,
      postText,
    };

    writeActualFile("data/check.json", "events", newEvents);
  } catch (e) {
    console.log("не удалось определить тело запроса", e);
    sendMessage(
      `Не удалось распарсить данные из "` + message.text + `"`,
      message.from.id,
      {
        disable_web_page_preview: true,
      }
    );
  }
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
  "/newpost": newCommand,
};

export { commands };
