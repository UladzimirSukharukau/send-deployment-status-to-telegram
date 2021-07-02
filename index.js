const core = require("@actions/core");
const github = require("@actions/github");
const https = require("https");

const ENV_PREFIX = process.env.ENV_PREFIX;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID;
const GITHUB_SHA = process.env.GITHUB_SHA;

try {
  const serviceHeader = core.getInput("service-header");
  const deployedTo = ENV_PREFIX || core.getInput("deployed-to");
  const botToken = core.getInput("bot-token");
  const chatId = core.getInput("chat-id");
  const status = core.getInput("status");

  if (!serviceHeader) throw new Error("serviceHeader argument not set");
  if (!botToken) throw new Error("bot-token argument not set");
  if (!chatId) throw new Error("chat-id argument not set");
  if (!status) throw new Error("status argument not set");

  let url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&parse_mode=HTML&text=`;
  let text = "";

  const statusStr = status === "success" ? "succeeded" : status === "failure" ? "failed" : "cancelled";
  let header = `<b>${serviceHeader} <a href='https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}'>deployment</a> to ${deployedTo} ${statusStr}</b>`;
  if (status === "failure") header = `‼️ ${header} ‼️`;
  if (status === "cancelled") header = `❗️ ${header} ❗️`;
  text += header;

  text += `%0A<a href='${github.context.payload.commits[0].url}'>${GITHUB_SHA.substr(0, 7)}</a>`;
  text += ` - <i>${github.context.payload.commits[0].author.name}</i>`;

  let message = github.context.payload.commits[0].message;
  message = message.split("\n")[0];
  message = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  message = message.replace(/[#&/+]/g, (c) => `%${c.charCodeAt(0).toString(16)}`);

  text += `%0A${message}`;

  url += text;

  https
    .get(url, (resp) => {
      let data = "";

      resp.on("data", (chunk) => {
        data += chunk;
      });

      resp.on("end", () => {
        console.log(JSON.stringify(JSON.parse(data), undefined, 2));
      });
    })
    .on("error", (err) => {
      console.log("Error: " + err.message);
    });
} catch (error) {
  core.setFailed(error.message);
}
