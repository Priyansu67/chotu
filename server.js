const { Configuration } = require("openai");
const { OpenAIApi } = require("openai");
const express = required('express');
const bodyParser = required("body-parser");
const axios = required("axios");
const cors = required('cors');

const OPENAI_API_KEY='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'
const ACCESS_TOKEN='EAAMz1TbWkowBAOcnxdKgay1gSGqq26YQUOI0oZAwccrewlBIANwaSXGCdeAa7E6uTmYbCfHB9qMQZCzk4UjWLaItgbZAIsVSNyK76R14m0wwSLjvvxNWdZB3jWHl83g7f1YbhYlZCpZBuQu1eD84HXamp5tHKeyK8qzxZBlcfuGfyQZBduyoU3jUGMW6OybDbB55cZCkZA60aiZCucDzZCJKxbuzmlJN7GUlCVwZD'
const MY_TOKEN='priyansuc67'


const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());
app.use(express.json());

//Whatsapp Part

app.use(bodyParser.json());

const access_token = ACCESS_TOKEN;
const my_token = MY_TOKEN;

app.get("/", (req, res) => {
    res.send("Hey, I am working");
});


app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let challenge = req.query["hub.challenge"];
  let token = req.query["hub.verify_token"];

  if (mode && token) {
    if (mode === "subscribe" && token === my_token) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

app.post("/webhook",async (req, res) => {
  let body = req.body;

  console.log(body.json());

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.message &&
      body.entry[0].changes[0].value.message[0]
    ) {
      let phone_number_id =
        body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = body.entry[0].changes[0].value.messages[0].from;
      let message = body.entry[0].changes[0].value.messages[0].text.body;
      let response;

      try {
        const prompt = message;
        response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `${prompt}`,
            temperature: 0.7,
            max_tokens: 5000,
            top_p: 1,
            frequency_penalty: 0.6,
            presence_penalty: 0.3,
          });
        
    } catch (error) {
        console.log(error);
        res.status(500).send({error});
    }

      axios({
        method: "post",
        url: `https://graph.facebook.com/v15.0/${phone_number_id}/messages?access_token=${access_token}`,
        data: {
          messaging_product: "whatsapp",
          to: from,
          text: {
            body: response.data.choices[0].text,
          },
        },
        headers: {
          "Content-Type": "application/json",
        },
      });

      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  }
});

app.listen(3000, () => console.log("webhook is listening"));
