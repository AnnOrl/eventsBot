import axios from "axios";

import config from "../config.json" assert { type: "json" };

const sendMessage = (text, chat_id, props = {}) => {
  if (process.env.MODE === "local") {
    console.log("sendMessage", text.slice(0, 50) + "...");
    return { message_id: 0 };
  }

  return axios({
    method: "post",
    url: encodeURI(`${config.apiTG}${config.telegram.token}/sendMessage`),
    data: {
      chat_id,
      parse_mode: "HTML",
      text,
      ...props,
    },
  })
    .then(({ data }) => {
      console.log("sendMessage", text.slice(0, 13) + "...");

      return data.result;
    })
    .catch((e) => {
      console.log(e);
    });
};

const sendPhoto = (photo, caption, chat_id, inline_keyboard, props = {}) => {
  if (process.env.MODE === "local") {
    console.log("sendPhoto", text.slice(0, 50) + "...");
    return { message_id: 0 };
  }
  return axios({
    method: "post",
    url: encodeURI(`${config.apiTG}${config.telegram.token}/sendPhoto`),
    data: {
      chat_id,
      photo,
      parse_mode: "HTML",
      caption,
      reply_markup: inline_keyboard
        ? {
            inline_keyboard,
          }
        : undefined,
      ...props,
    },
  })
    .then(({ data }) => {
      console.log("sendPhoto", caption.slice(0, 13) + "...");

      return data.result;
    })
    .catch((e) => {
      console.log(e);
    });
};

const editMessageText = (
  text,
  chat_id,
  message_id,
  inline_keyboard,
  props = {}
) => {
  if (process.env.MODE === "local") {
    console.log("editMessage", text.slice(0, 50) + "...");
    return { message_id: 0 };
  }

  return axios({
    method: "post",
    url: encodeURI(`${config.apiTG}${config.telegram.token}/editMessageText`),
    data: {
      message_id,
      chat_id,
      parse_mode: "HTML",
      text,
      ...(inline_keyboard ? { reply_markup: { inline_keyboard } } : {}),
      ...props,
    },
  })
    .then(({ data }) => {
      console.log("editMessageText", text.slice(0, 13) + "...");

      return data.result;
    })
    .catch((e) => {
      console.log(e);
    });
};

const deleteMessage = (chat_id, message_id) => {
  if (process.env.MODE === "local") {
    console.log("deleteMessage", message_id);
    return { message_id: 0 };
  }

  return axios({
    method: "post",
    url: encodeURI(`${config.apiTG}${config.telegram.token}/deleteMessage`),
    data: {
      message_id,
      chat_id,
    },
  })
    .then(({ data }) => {
      console.log("deleteMessage");

      return data.result;
    })
    .catch((e) => {
      console.log(e);
    });
};

const sendMarkup = (
  text,
  inline_keyboard,
  chat_id = config.telegram.chat_id
) => {
  if (process.env.MODE === "local") {
    console.log("sendMarkup", text.slice(0, 50) + "...");
    return { message_id: 0 };
  }

  return axios({
    method: "post",
    url: encodeURI(`${config.apiTG}${config.telegram.token}/sendMessage`),
    data: {
      chat_id,
      parse_mode: "HTML",
      text,
      reply_markup: { inline_keyboard },
    },
  })
    .then(({ data }) => {
      console.log("sendMarkup", text.slice(0, 13) + "...");
      return data.result;
    })
    .catch((e) => {
      console.log(e);
    });
};

const replyMessageForChat = (text, message) => {
  sendMessage(
    text,
    message.chat.id,
    message.chat.id !== message.from.id && message.message_id
  );
};

export {
  sendMessage,
  replyMessageForChat,
  sendMarkup,
  editMessageText,
  deleteMessage,
  sendPhoto,
};
