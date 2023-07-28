import {
  deleteMessage,
  editMessageText,
  sendMessage,
  sendPhoto,
} from "./tgApi.js";
import { readFile, writeActualFile } from "./utils.js";
import config from "../config.json" assert { type: "json" };

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

const sendEvent = async (img, text, href) => {
  const { message_id } = await sendPhoto(
    img,
    text,
    config.telegram.channel_chat_id, //!!!!
    href ? [[{ text: "Перейти по ссылке", url: href }]] : null
  );

  return { message_id };
};

const publishEvent = async ({ message }) => {
  console.log("publish");
  const { events: checkEvents, checkin } = readFile("data/check.json");

  const { postText, check_message_id, linkHref, ...currentEvent } =
    checkEvents[message.message_id];

  const { message_id } = await sendEvent(currentEvent.img, postText, linkHref);

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
  publishAnnouncement: publishAnnouncement,
};

export { actions };
