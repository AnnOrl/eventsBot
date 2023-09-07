import moment from "moment";
moment.locale("ru");

import config from "../../config.json" assert { type: "json" };
import { waitOneHour } from "../utils.js";
import { sendMarkup, sendMessage, sendPhoto } from "../tgApi.js";

import { ChatGPTUnofficialProxyAPI } from "chatgpt";
import { stopServer } from "../../bin/www.js";

const api = new ChatGPTUnofficialProxyAPI({
  accessToken: config.accessToken,
  apiReverseProxyUrl: "https://ai.fakeopen.com/api/conversation",
});

const sendCheckEvent = async (img, name, text, href, sameName) => {
  const fullText = name ? `<b>${name}</b>\n\n${text}` : text;
  const { message_id } = await sendMarkup(
    fullText,
    [
      [{ text: "Посмотреть", url: href }],
      ...(sameName
        ? [
          [
            {
              text: "Посмотреть аналогичный",
              url: "https://t.me/events_chisinau/" + sameName,
            },
          ],
        ]
        : []),
      [{ text: "Переработать", callback_data: "rewrite" }],
      [{ text: "Редактировать вручную", callback_data: "edit" }],
      [{ text: "Опубликовать", callback_data: "publish" }],
      [{ text: "Удалить", callback_data: "delete" }],
    ],
    config.telegram.my_chat_id
  );

  return { message_id, text: fullText };
};

const chatGPTRequest = async (
  {
    img,
    name,
    price,
    text,
    linkHref,
    date: filterDate,
    timeEvent,
    location,
    dateStart,
    dateEnd,
    textDate,
    category
  },
  sameName
) => {
  console.log("\nАнализ chatGPT");

  try {
    let res = { text };
    if (process.env.MODE !== "no-gpt" && process.env.MODE !== "local") {
      res = await api
        .sendMessage(`Переведи текст на русский язык.\n` + (text || name))
        .then((res) => {
          console.log("\nФормируем пост");
          return api.sendMessage(
            `Сформируй на основании переведенного текста очень короткий пост для телеграм канала. Удали упоминание цены, времени, места и контактную информацию, удали все ссылки. Не добавляй никакую информацию, которой нет в исходном тексте. Не используй двойные кавычки.`,
            {
              parentMessageId: res.id,
              conversationId: res.conversationId,
            }
          );
        })
        .then((res) => {
          console.log("\nПолучаем дату время место");
          return api.sendMessage(
            `Выдели из переведенного текста значения даты события (date), места проведения события (place), стоимость события (price), определи категорию события (category) и верни в виде json {date: '', place:'', price: '', category: ''}. Не добавляй кавычки. Верни все значения на русском языке. Если в исходном тексте какого-либо из этих значений - верни пустую строку "". верни только json,  без лишних комментариев`,
            {
              parentMessageId: res.id,
              conversationId: res.conversationId,
            }
          );
        })
        .then((res) => {
          console.log("\nДобавляем в начало поста");
          const {
            date,
            place,
            category: categoryGPT,
            price: textPrice,
          } = JSON.parse(res?.text || {});
          console.log(category, categoryGPT)
          return api.sendMessage(
            `забудь про json. Добавь в начало поста следующую информацию, переведи при необходимости на русский язык: ${(category && category !== "") || (categoryGPT && categoryGPT !== "") ? `\n🏷️ ${category || categoryGPT}` : ""
            }${(!!price && price !== "") || (!!textPrice && textPrice != "")
              ? `\n💰 ${price || textPrice}`
              : ""
            }${!!textDate || date !== "" || !!filterDate
              ? `\n🗓️ ${textDate ||
              date ||
              moment(new Date(filterDate)).format("D MMMM, dddd")
              }`
              : ""
            }${timeEvent !== "" ? `\n🕒 ${timeEvent}` : ""}${!!location || !!place ? `\n📍 ${location || place}` : ""
            } \n`,
            {
              parentMessageId: res.id,
              conversationId: res.conversationId,
            }
          );
        })
        .then(async (res) => {
          if (res.text.length > 800) {
            console.log("\nОбрезаем");
            const { text } = await api.sendMessage(
              `Переведи итоговый пост в формат json в переменную post. Сейчас там ${res.text.length} символов. Если количество символов больше 800, уменьши итоговый пост, он должен быть меньше 800 символов при подсчете post.length включая  escape-последовательности (например, для спецсимволов), форматирование эмодзи и переносы строк. Не меняй часть, которую я тебя попросила добавить в предыдущем сообщении (с указанием цены и так далее). Не используй двойные кавычки " в тексте. Замени значение переменной post на уменьшенную версию текста. В ответ я хочу получить только json с уменьшенным текстом поста.Не пиши никаких своих комментариев, не присылай оправдания, я хочу видеть в ответ только JSON. JSON должен быть один. Текст должен быть на русском языке.`,
              {
                parentMessageId: res.id,
                conversationId: res.conversationId,
              }
            );

            const jsonText = JSON.parse(text);

            return { ...res, text: jsonText?.post ? jsonText?.post : text };
          } else {
            return res;
          }
        })
        .then(async (res) => {
          if (res.text.length > 800) {
            console.log("\nСнова обрезаем");
            const { text } = await api.sendMessage(
              `Длина полученного текста ${res.text.length
              } символов. Максимально уменьши этот текст, убери из основного текста поста минимум ${res.text.length - 800
              } символов. Не меняй часть, которую я просила добавить в начале поста (с ценой, категорией и так далее). Не используй двойные кавычки. Не пиши никаких своих комментариев, не присылай оправдания, я хочу видеть в ответ только JSON в формате {post: ''}, где post - уменьшенный текст поста. Текст должен быть на русском языке.`,
              {
                parentMessageId: res.id,
                conversationId: res.conversationId,
              }
            );

            const jsonText = JSON.parse(text);

            return { text: jsonText?.post ? jsonText?.post : text };
          } else {
            return res;
          }
        });
    }
    console.log("\nпубликация", res?.text?.length);

    return sendCheckEvent(
      img,
      name,
      res.text.slice(0, 900),
      linkHref,
      sameName
    );
  } catch (e) {
    if (e.statusCode === 401) {
      await sendMessage(
        "Истек код авторизации ChatGPT",
        config.telegram.my_chat_id
      );
      stopServer();
      throw new Error(e.statusCode);
    }

    await waitOneHour();
    return chatGPTRequest(
      {
        img,
        name,
        price,
        text,
        linkHref,
        date: filterDate,
        timeEvent,
        location,
        dateStart,
        dateEnd,
        textDate,
      },
      sameName
    );
  }
};

const chatGPTTranslate = async (
  text
) => {
  console.log("\Перевод chatGPT");

  try {
    let res = { text };
    if (process.env.MODE !== "no-gpt" && process.env.MODE !== "local") {
      res = await api
        .sendMessage(`Переведи текст на русский язык. В ответ верни только переведенный текст вместе с форматированием\n` + (text || name))
    }
    console.log("\nпубликация", res?.text?.length);


  } catch (e) {
    if (e.statusCode === 401) {
      await sendMessage(
        "Истек код авторизации ChatGPT",
        config.telegram.my_chat_id
      );
      throw new Error(e.statusCode);
    }

    await waitOneHour();
    return chatGPTRequest(
      {
        img,
        name,
        price,
        text,
        linkHref,
        date: filterDate,
        timeEvent,
        location,
        dateStart,
        dateEnd,
        textDate,
      },
      sameName
    );
  }
};
export { chatGPTRequest, sendCheckEvent };
