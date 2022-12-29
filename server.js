import { Configuration } from "openai";
import { OpenAIApi } from "openai";
import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";
import * as dotenv from "dotenv";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);


async function botMessage(prompt) {
const completion = await  openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        maxTokens: 50000,
        temperature: 0.5,
        top_p: 1,
        presence_penalty: 0,
        frequency_penalty: 0,
});

return completion.data.choices[0].text;

};

//Whatsapp Part

const app = express();
app.use(bodyParser.json());

const access_token = process.env.ACCESS_TOKEN;
const myToken = process.env.MY_TOKEN;

app.get("/", function (req, res) {
  res.send(
    'This is a WhatsApp bot. Please go to <a href="https://developers.facebook.com/docs/whatsapp/api/messages">https://developers.facebook.com/docs/whatsapp/api/messages</a> to learn more about the WhatsApp API.'
  );
});

app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === myToken) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
      console.log("Invalid webhook subscription");
    }
  } else {
    console.log("Missing webhook parameters");
  }
});

app.post("/webhook", async (req, res) => {
  console.log(JSON.stringify(req.body, null, 2));

  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      let phone_number_id =
        req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
      let prompt = req.body.entry[0].changes[0].value.messages[0].text.body;
      let botMsg = botMessage(prompt); // extract the message text from the webhook payload
      axios({
        method: "POST", // Required, HTTP method, a string, e.g. POST, GET
        url:
          "https://graph.facebook.com/v12.0/" +
          phone_number_id +
          "/messages?access_token=" +
          access_token,
        data: {
          messaging_product: "whatsapp",
          to: from,
          text: { body: "Chotu: " + botMsg },
        },
        headers: { "Content-Type": "application/json" },
      });
    }
    res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }

});

app.listen(5000 || process.env.PORT, () =>
  console.log("Server is running on port " + process.env.PORT)
);