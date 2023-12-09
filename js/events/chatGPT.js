import moment from "moment";
moment.locale("ru");

import config from "../../config.json" assert { type: "json" };
import { wait, waitOneHour, isRuTextLanguage, truncateTextToLastDot } from "../utils.js";
import { sendMarkup, sendMessage, sendPhoto } from "../tgApi.js";

import { ChatGPTUnofficialProxyAPI } from "chatgpt";
import { stopServer } from "../../bin/www.js";

const api = new ChatGPTUnofficialProxyAPI({
  accessToken: config.accessToken,
  apiReverseProxyUrl: "https://ai-20231125.fakeopen.com/api/conversation",
});

const sendCheckEvent = async (img, name, text, href, sameName, prevText = '') => {
  const fullText = name ? `<b>${name}</b>\n${text}` : text;
  const prevTextP = name ? `<b>${name}</b>\n${prevText}` : prevText;
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
      [{ text: "Опубликовать без текста", callback_data: "publishprev" }],
      [{ text: "Удалить", callback_data: "delete" }],
    ],
    config.telegram.my_chat_id
  );

  return { message_id, text: fullText, prevText: prevTextP };
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
  let post = text.slice(0, 900);
  try {
    let res = { text };
    const prevText = `${(category && category !== "") ? `\n🏷️ ${category}` : ""
      }${(!!price && price !== "")
        ? `\n💰 ${price}`
        : ""
      }${!!textDate || !!filterDate
        ? `\n🗓️ ${textDate ||
        moment(new Date(filterDate)).format("D MMMM, dddd")
        }`
        : ""
      }${timeEvent !== "" ? `\n🕒 ${timeEvent}` : ""}${!!location ? `\n📍 ${location}` : ""
      }`;

    if (process.env.MODE !== "no-gpt" && process.env.MODE !== "local") {
      res = await api
        .sendMessage(`Переведи текст на русский язык.\n` + (text.replace(/[^a-zа-яё0-9\s]/gi, '') || name))
        .then(async (res) => {
          post = res?.text || post;

          console.log("\nФормируем пост");
          return res.id ? api.sendMessage(
            `Сформируй на основании переведенного текста очень короткий пост для телеграм канала. Удали упоминание цены, времени, места и контактную информацию, удали все ссылки. Не добавляй никакую информацию, которой нет в исходном тексте. Не используй двойные кавычки.`,
            {
              parentMessageId: res.id,
              conversationId: res.conversationId,
            }
          ) : {};
        })
        .then(async (res) => {
          post = res?.text || post;

          console.log("\nПолучаем дату время место");
          return res.id ? api.sendMessage(
            `Выдели из переведенного текста значения даты события (date), места проведения события (place), стоимость события (price), определи категорию события (category) и верни в виде json {date: '', place:'', price: '', category: ''}. Не добавляй кавычки. Верни все значения на русском языке. Если в исходном тексте какого-либо из этих значений - верни пустую строку "". верни только json,  без лишних комментариев`,
            {
              parentMessageId: res.id,
              conversationId: res.conversationId,
            }
          ) : {};
        })
        .then(async (res) => {
          console.log("\nДобавляем в начало поста");
          console.log('1!!!res', res?.text)
          const {
            date,
            place,
            category: categoryGPT,
            price: textPrice,
          } = res?.text ? JSON.parse(res?.text) : {};
          console.log(category, categoryGPT);

          const prevText = `${(category && category !== "") || (categoryGPT && categoryGPT !== "") ? `\n🏷️ ${category || categoryGPT}` : ""
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
            } \n\n`;

          return !!res?.text ?
            api.sendMessage(
              `забудь про json. Добавь в начало поста следующую информацию, не добавляй слов "категория, стоимость, дата, время, место". переведи при необходимости на русский язык: ${prevText} \n`,
              {
                parentMessageId: res.id,
                conversationId: res.conversationId,
              }
            ) : { text: prevText.replace(/\n/, '') + post };
          // return api.sendMessage(
          //   `забудь про json. Добавь в начало поста следующую информацию, не добавляй слов "категория, стоимость, дата, время, место". переведи при необходимости на русский язык: ${prevText} \n`,
          //   {
          //     parentMessageId: res.id,
          //     conversationId: res.conversationId,
          //   }
          // );
        })
        .then(async (res) => {
          if (res.id && res.text.length > 800) {
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
          if (res.id && res.text.length > 800) {
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
    } else if (process.env.MODE === "no-gpt") {
      if (isRuTextLanguage(res.text)) {
        res.text = truncateTextToLastDot(((prevText ? prevText + '\n' : '') + res.text.slice(0, 800)).replace(/\n\n/g, "\n"));
      } else {
        res.text = prevText + ''
      }


      await wait(300);
    }

    console.log("\nпубликация", res?.text?.length);
    return sendCheckEvent(
      img,
      name,
      res.text.slice(0, 900),
      linkHref,
      sameName,
      prevText
    );
  } catch (e) {
    if (e.statusCode === 401) {
      await sendMessage(
        "Истек код авторизации ChatGPT",
        config.telegram.my_chat_id
      );
      await wait(10000000);
      stopServer();
      throw new Error(e.statusCode);
    }
    console.log(e);

    if (e.statusCode === 429) {
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
