import {
  copyMessage,
  deleteMessage,
  editMessageText,
  sendMessage,
  sendPhoto,
} from "./tgApi.js";
import { getRandomInt, readFile, writeActualFile } from "./utils.js";
import config from "../config.json" assert { type: "json" };
import moment from "moment";

const rewriteEvent = ({ message }) => {
  console.log("rewrite");
  const { events, checkin } = readFile("data/check.json");
  const { linkHref } = events[message.message_id] || {};
  writeActualFile("data/check.json", "events", {
    ...events,
    [message.message_id]: undefined,
  });

  writeActualFile(
    "data/check.json",
    "checkin",
    checkin.filter((href) => href !== linkHref)
  );

  deleteMessage(message.chat.id, message.message_id);
};
const editEvent = ({ message }) => {
  console.log("edit");
  const { events, checkin } = readFile("data/check.json");
  const { linkHref } = events[message.message_id] || {};

  const { check_message_id, date, ...event } = events[message.message_id];

  editMessageText(JSON.stringify({
    ...event,
    date: moment(date).format('MM-DD-YYYY')
  }), message.chat.id, message.message_id, [], {
    disable_web_page_preview: true,
  });

  writeActualFile("data/check.json", "events", {
    ...events,
    [message.message_id]: undefined,
  });

  writeActualFile(
    "data/check.json",
    "checkin",
    checkin.filter((href) => href !== linkHref)
  );
};
const deleteEvent = ({ message }) => {
  console.log("delete");

  deleteMessage(message.chat.id, message.message_id);
};
let timerId;
let timerCount = 0;
let lastPublish;
// const minCount = 3;

const sendEvent = async (img, text, href, message = null) => {
  return new Promise((resolve) => {
    timerCount++;
    let timer;
    const diff = lastPublish && moment().diff(lastPublish);

    const addedMin = getRandomInt(10, 20);
    if (!lastPublish || diff > (60000 * addedMin)) {
      timer = 0;
    } else {
      timer = (60000 * addedMin) * timerCount - diff;
    }

    let interval;
    let intervalCount = 0;

    if (message && timer) {
      editMessageText('Сообщение поставлено в очередь через ' + ((timer - 60000) / 60000).toFixed(2) + 'м', message.chat.id, message.message_id);

      interval = setInterval(() => {
        intervalCount++;
        editMessageText('Сообщение поставлено в очередь через ' + ((timer - ((intervalCount + 1) * 60000)) / 60000).toFixed(2) + 'м', message.chat.id, message.message_id)
      }, 60000)
    }

    timerId = setTimeout(async () => {
      interval && clearInterval(interval);
      const { message_id } = await sendPhoto(
        img,
        text,
        config.telegram.channel_chat_id,
        href ? [[{ text: "Перейти по ссылке", url: href }]] : null
      ).then(async (data) => {
        if (data?.message_id) {
          console.log("posting");
          return data;
        } else {
          console.log("reposting");
          return await sendMessage(
            text + `\n <a href='${href}'>Подробности</a>`,
            config.telegram.channel_chat_id
          );
        }
      });

      resolve({ message_id });
      console.log("очередь уменьшена");
      timerCount--;
      lastPublish = moment();
    }, timer);
  });
};

const publishEvent = async ({ message }) => {
  console.log("publish");
  const { events: checkEvents, checkin } = readFile("data/check.json");

  console.log(message.message_id, checkEvents[message.message_id])
  const { postText, check_message_id, linkHref, ...currentEvent } =
    checkEvents[message.message_id];

  const { message_id } = await sendEvent(currentEvent.img, postText, linkHref, message);

  const { events: publishedEvents } = readFile("data/events.json");

  writeActualFile("data/events.json", "events", {
    ...publishedEvents,
    [linkHref || currentEvent.name + currentEvent.date]: {
      ...currentEvent,
      linkHref,
      message_id,
    },
  });

  writeActualFile("data/check.json", "events", {
    ...checkEvents,
    [message.message_id]: undefined,
  });

  writeActualFile(
    "data/check.json",
    "checkin",
    checkin.filter((href) => href !== linkHref)
  );

  deleteMessage(message.chat.id, message.message_id);
};
const publishprevEvent = async ({ message }) => {
  console.log("publishPrev");
  const { events: checkEvents, checkin } = readFile("data/check.json");

  console.log(message.message_id, checkEvents[message.message_id])
  const { postText, prevText, check_message_id, linkHref, ...currentEvent } =
    checkEvents[message.message_id];

  const { message_id } = await sendEvent(currentEvent.img, prevText, linkHref, message);

  const { events: publishedEvents } = readFile("data/events.json");

  writeActualFile("data/events.json", "events", {
    ...publishedEvents,
    [linkHref || currentEvent.name + currentEvent.date]: {
      ...currentEvent,
      linkHref,
      message_id,
    },
  });

  writeActualFile("data/check.json", "events", {
    ...checkEvents,
    [message.message_id]: undefined,
  });

  writeActualFile(
    "data/check.json",
    "checkin",
    checkin.filter((href) => href !== linkHref)
  );

  deleteMessage(message.chat.id, message.message_id);
};
const publishFilmsNow = async ({ message }) => {
  console.log("publishFilmsNow");

  copyMessage(config.telegram.channel_chat_id, message.message_id, message.chat.id)

  deleteMessage(message.chat.id, message.message_id);
};

const publishAnnouncement = async ({ message }) => {
  console.log("publishAnnouncement");

  sendMessage(message.text, config.telegram.channel_chat_id, {
    disable_web_page_preview: true,
  });

  deleteMessage(message.chat.id, message.message_id);
};

const actions = {
  rewrite: rewriteEvent,
  publish: publishEvent,
  publishprev: publishprevEvent,
  delete: deleteEvent,
  edit: editEvent,
  publishAnnouncement: publishAnnouncement,
  publishFilmsNow
};

export { actions };
