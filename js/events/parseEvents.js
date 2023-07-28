import moment from "moment";
moment.locale("ru");

import { writeActualFile, readFile } from "../utils.js";
import { chatGPTRequest } from "./chatGPT.js";

const saveEvents = async ({
  img,
  name,
  price,
  text,
  linkHref,
  date,
  timeEvent,
  location,
  hEvent,
  mEvent,
}) => {
  const { message_id: check_message_id, text: postText } = await chatGPTRequest(
    img,
    name,
    price,
    text,
    linkHref,
    date,
    timeEvent,
    location
  );

  const { events: savedEvents, checkin } = readFile("data/check.json");
  let newEvents = { ...savedEvents };

  newEvents[check_message_id] = {
    img,
    name,
    price,
    date: moment(date).hours(hEvent).minutes(mEvent).seconds("00").valueOf(),
    check_message_id,
    location,
    linkHref,
    postText,
  };

  writeActualFile("data/check.json", "events", newEvents);
  writeActualFile("data/check.json", "checkin", [...checkin, linkHref]);
};
export { saveEvents };
